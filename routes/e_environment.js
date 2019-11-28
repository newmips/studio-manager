var express = require('express');
var router = express.Router();
var block_access = require('../utils/block_access');
// Datalist
var filterDataTable = require('../utils/filter_datatable');

// Sequelize
var models = require('../models/');
var attributes = require('../models/attributes/e_environment');
var options = require('../models/options/e_environment');

var model_builder = require('../utils/model_builder');
var entity_helper = require('../utils/entity_helper');
var file_helper = require('../utils/file_helper');
var status_helper = require('../utils/status_helper');
var component_helper = require('../utils/component_helper');
var attr_helper = require('../utils/attr_helper');

var globalConfig = require('../config/global');
var fs = require('fs-extra');
var dust = require('dustjs-linkedin');
var moment = require("moment");
var SELECT_PAGE_SIZE = 10;

// Enum and radio managment
var enums_radios = require('../utils/enum_radio.js');

// Winston logger
var logger = require('../utils/logger');

const portainerAPI = require("../services/portainer_api")

router.get('/list', block_access.actionAccessMiddleware("environment", "read"), function(req, res) {
    res.render('e_environment/list');
});

router.post('/datalist', block_access.actionAccessMiddleware("environment", "read"), function(req, res) {
    filterDataTable("E_environment", req.body).then(function(rawData) {
        entity_helper.prepareDatalistResult('e_environment', rawData, req.session.lang_user).then(function(preparedData) {
            res.send(preparedData).end();
        }).catch(function(err) {
            console.error(err);
            logger.debug(err);
            res.end();
        });
    }).catch(function(err) {
        console.error(err);
        logger.debug(err);
        res.end();
    });
});

router.post('/subdatalist', block_access.actionAccessMiddleware("environment", "read"), function(req, res) {
    var start = parseInt(req.body.start || 0);
    var length = parseInt(req.body.length || 10);

    var sourceId = req.query.sourceId;
    var subentityAlias = req.query.subentityAlias, subentityName = req.query.subentityModel;
    var subentityModel = entity_helper.capitalizeFirstLetter(req.query.subentityModel);
    var doPagination = req.query.paginate;

    // Build array of fields for include and search object
    var isGlobalSearch = req.body.search.value == "" ? false : true;
    var search = {}, searchTerm = isGlobalSearch ? '$or' : '$and';
    search[searchTerm] = [];
    var toInclude = [];
    // Loop over columns array
    for (var i = 0, columns = req.body.columns; i < columns.length; i++) {
        if (columns[i].searchable == 'false')
            continue;

        // Push column's field into toInclude. toInclude will be used to build the sequelize include. Ex: toInclude = ['r_alias.r_other_alias.f_field', 'f_name']
        toInclude.push(columns[i].data);

        // Add column own search
        if (columns[i].search.value != "") {
            var {type, value} = JSON.parse(columns[i].search.value);
            search[searchTerm].push(model_builder.formatSearch(columns[i].data, value, type));
        }
        // Add column global search
        if (isGlobalSearch)
            search[searchTerm].push(model_builder.formatSearch(columns[i].data, req.body.search.value, req.body.columnsTypes[columns[i].data]));
    }
    for (var i = 0; i < req.body.columns.length; i++)
        if (req.body.columns[i].searchable == 'true')
            toInclude.push(req.body.columns[i].data);
    // Get sequelize include object
    var subentityInclude = model_builder.getIncludeFromFields(models, subentityName, toInclude);

    // ORDER BY
    var order, stringOrder = req.body.columns[req.body.order[0].column].data;
    // If ordering on an association field, use Sequelize.literal so it can match field path 'r_alias.f_name'
    order = stringOrder.indexOf('.') != -1 ? [[models.Sequelize.literal(stringOrder), req.body.order[0].dir]] : [[stringOrder, req.body.order[0].dir]];

    var include = {
        model: models[subentityModel],
        as: subentityAlias,
        order: order,
        include: subentityInclude
    }
    if (search[searchTerm].length > 0)
        include.where = search;

    if (search[searchTerm].length > 0)
        include.where = search;

    if (doPagination == "true") {
        include.limit = length;
        include.offset = start;
    }

    include.required = false;

    models.E_environment.findOne({
        where: {
            id: parseInt(sourceId)
        },
        include: include
    }).then(function(e_environment) {
        if (!e_environment['count' + entity_helper.capitalizeFirstLetter(subentityAlias)]) {
            console.error('/subdatalist: count' + entity_helper.capitalizeFirstLetter(subentityAlias) + ' is undefined');
            return res.status(500).end();
        }

        e_environment['count' + entity_helper.capitalizeFirstLetter(subentityAlias)]().then(function(count) {
            var rawData = {
                recordsTotal: count,
                recordsFiltered: count,
                data: []
            };
            for (var i = 0; i < e_environment[subentityAlias].length; i++)
                rawData.data.push(e_environment[subentityAlias][i].get({plain: true}));

            entity_helper.prepareDatalistResult(req.query.subentityModel, rawData, req.session.lang_user).then(function(preparedData) {
                res.send(preparedData).end();
            }).catch(function(err) {
                console.error(err);
                logger.debug(err);
                res.end();
            });
        });
    });
});

router.get('/create_form', block_access.actionAccessMiddleware("environment", "create"), function(req, res) {
    var data = {
        enum_radio: enums_radios.translated("e_environment", req.session.lang_user, options)
    };

    if (typeof req.query.associationFlag !== 'undefined') {
        data.associationFlag = req.query.associationFlag;
        data.associationSource = req.query.associationSource;
        data.associationForeignKey = req.query.associationForeignKey;
        data.associationAlias = req.query.associationAlias;
        data.associationUrl = req.query.associationUrl;
    }

    // Check if configuration is full
    models.E_configuration.findOne({
        where: {
            id: 1
        }
    }).then(configuration => {
        let requiredConf = [
            'f_studio_domain',
            'f_cloud_domain',
            'f_gitlab_url',
            'f_gitlab_login',
            'f_gitlab_private_token',
            'f_portainer_api_url',
            'f_portainer_login',
            'f_portainer_password'
        ];

        for (var i = 0; i < requiredConf.length; i++) {
            if(!configuration[requiredConf[i]] || configuration[requiredConf[i]] == ""){
                req.session.toastr = [{
                    message: "Merci de renseigner entièrement la configuration avant de créer une stack !",
                    level: "error"
                }];
                return res.redirect("/configuration/update_form");
            }
        }

        // Get new valid IP
        models.E_environment.findAll().then(environments => {

            let lastIP = 0, splitIP, ipStructure = null;

            for (env of environments) {
                splitIPContainer = env.f_container_ip.split(".");
                splitIPDatabase = env.f_database_ip.split(".");
                if(!ipStructure)
                    ipStructure = env.f_container_ip.split(".").slice(0, -1).join(".");

                if(lastIP < splitIPContainer[splitIPContainer.length - 1])
                    lastIP = splitIPContainer[splitIPContainer.length - 1]

                if(lastIP < splitIPDatabase[splitIPDatabase.length - 1])
                    lastIP = splitIPDatabase[splitIPDatabase.length - 1]
            }

            data.containerIP = ipStructure + "." + ++lastIP;
            data.databaseIP = ipStructure + "." + ++lastIP;

            portainerAPI.getAvailabeImages().then(allImages => {
                data.allImages = allImages.filter(x => x.indexOf('mysql') == -1 && x.indexOf('postgres') == -1 );
                data.allImagesDB = allImages.filter(x => x.indexOf('mysql') != -1 || x.indexOf('postgres') != -1 );
                // Get association data that needed to be load directly here (to do so set loadOnStart param to true in options).
                entity_helper.getLoadOnStartData(data, options).then(function(data) {
                    var view = req.query.ajax ? 'e_environment/create_fields' : 'e_environment/create';
                    res.render(view, data);
                }).catch(function(err) {
                    entity_helper.error(err, req, res, '/environment/create_form', "e_environment");
                })
            });
        })
    })
});

router.post('/create', block_access.actionAccessMiddleware("environment", "create"), function(req, res) {

    req.body.f_name = attr_helper.clearString(req.body.f_name).replace(/[-_.]/g, "").toLowerCase();
    portainerAPI.generateStack(req.body.f_name, req.body.f_container_ip, req.body.f_database_ip, req.body.f_image, req.body.f_db_image).then(err => {

        var createObject = model_builder.buildForRoute(attributes, options, req.body);

        models.E_environment.create(createObject).then(function(e_environment) {
            var redirect = '/environment/list';
            req.session.toastr = [{
                message: 'message.create.success',
                level: "success"
            }];

            var promises = [];

            // We have to find value in req.body that are linked to an hasMany or belongsToMany association
            // because those values are not updated for now
            model_builder.setAssocationManyValues(e_environment, req.body, createObject, options).then(function() {
                Promise.all(promises).then(function() {
                    component_helper.setAddressIfComponentExist(e_environment, options, req.body).then(function() {
                        res.redirect(redirect);
                    });
                }).catch(function(err) {
                    entity_helper.error(err, req, res, '/environment/create_form', "e_environment");
                });
            });
        }).catch(function(err) {
            entity_helper.error(err, req, res, '/environment/create_form', "e_environment");
        });

    }).catch(err => {
        console.error("ERROR WHILE GENERATING STUDIO STACK")
        console.log(err.message);
        req.session.toastr = [{
            message: "Une erreur s'est produite lors de la génération de la stack sur Portainer.",
            level: "error"
        }];
        return res.redirect("/environment/create_form")
    })
});

router.get('/loadtab/:id/:alias', block_access.actionAccessMiddleware('environment', 'read'), function(req, res) {
    var alias = req.params.alias;
    var id = req.params.id;

    // Find tab option
    var option;
    for (var i = 0; i < options.length; i++)
        if (options[i].as == req.params.alias) {
            option = options[i];
            break;
        }
    if (!option)
        return res.status(404).end();

    // Check access rights to subentity
    if (!block_access.entityAccess(req.session.passport.user.r_group, option.target.substring(2)))
        return res.status(403).end();

    var queryOpts = {
        where: {
            id: id
        }
    };
    // If hasMany, no need to include anything since it will be fetched using /subdatalist
    if (option.structureType != 'hasMany')
        queryOpts.include = {
            model: models[entity_helper.capitalizeFirstLetter(option.target)],
            as: option.as,
            include: {
                all: true
            }
        }

    // Fetch tab data
    models.E_environment.findOne(queryOpts).then(function(e_environment) {
        if (!e_environment)
            return res.status(404).end();

        var dustData = e_environment[option.as] || null;
        var empty = !dustData || (dustData instanceof Array && dustData.length == 0) ? true : false;
        var dustFile, idSubentity, promisesData = [];
        var subentityOptions = [];

        // Default value
        option.noCreateBtn = false;

        // Build tab specific variables
        switch (option.structureType) {
            case 'hasOne':
                if (!empty) {
                    idSubentity = dustData.id;
                    dustData.hideTab = true;
                    dustData.enum_radio = enums_radios.translated(option.target, req.session.lang_user, options);
                    promisesData.push(entity_helper.getPicturesBuffers(dustData, option.target));
                    // Fetch status children to be able to switch status
                    // Apply getR_children() on each current status
                    var subentityOptions = require('../models/options/' + option.target);
                    dustData.componentAddressConfig = component_helper.getMapsConfigIfComponentAddressExist(option.target);
                    for (var i = 0; i < subentityOptions.length; i++)
                        if (subentityOptions[i].target.indexOf('e_status') == 0)
                            (function(alias) {
                                promisesData.push(new Promise(function(resolve, reject) {
                                    dustData[alias].getR_children({
                                        include: [{
                                            model: models.E_group,
                                            as: "r_accepted_group"
                                        }]
                                    }).then(function(children) {
                                        dustData[alias].r_children = children;
                                        resolve();
                                    });
                                }));
                            })(subentityOptions[i].as);
                }
                dustFile = option.target + '/show_fields';
                break;

            case 'hasMany':
                dustFile = option.target + '/list_fields';
                // Status history specific behavior. Replace history_model by history_table to open view
                if (option.target.indexOf('e_history_e_') == 0)
                    option.noCreateBtn = true;
                dustData = {
                    for: 'hasMany'
                };
                if (typeof req.query.associationFlag !== 'undefined') {
                    dustData.associationFlag = req.query.associationFlag;
                    dustData.associationSource = req.query.associationSource;
                    dustData.associationForeignKey = req.query.associationForeignKey;
                    dustData.associationAlias = req.query.associationAlias;
                    dustData.associationUrl = req.query.associationUrl;
                }
                break;

            case 'hasManyPreset':
                dustFile = option.target + '/list_fields';
                var obj = {};
                obj[option.target] = dustData;
                dustData = obj;
                if (typeof req.query.associationFlag !== 'undefined') {
                    dustData.associationFlag = req.query.associationFlag;
                    dustData.associationSource = req.query.associationSource;
                    dustData.associationForeignKey = req.query.associationForeignKey;
                    dustData.associationAlias = req.query.associationAlias;
                    dustData.associationUrl = req.query.associationUrl;
                }
                dustData.for = 'fieldset';
                for (var i = 0; i < dustData[option.target].length; i++)
                    promisesData.push(entity_helper.getPicturesBuffers(dustData[option.target][i], option.target, true));

                break;

            case 'localfilestorage':
                dustFile = option.target + '/list_fields';
                var obj = {};
                obj[option.target] = dustData;
                dustData = obj;
                dustData.sourceId = id;
                break;

            default:
                return res.status(500).end();
        }

        // Get association data that needed to be load directly here (to do so set loadOnStart param to true in options).
        entity_helper.getLoadOnStartData(dustData, subentityOptions).then(function(dustData) {
            // Image buffer promise
            Promise.all(promisesData).then(function() {
                // Open and render dust file
                var file = fs.readFileSync(__dirname + '/../views/' + dustFile + '.dust', 'utf8');
                dust.insertLocalsFn(dustData ? dustData : {}, req);
                dust.renderSource(file, dustData || {}, function(err, rendered) {
                    if (err) {
                        console.error(err);
                        return res.status(500).end();
                    }

                    // Send response to ajax request
                    res.json({
                        content: rendered,
                        data: idSubentity || {},
                        empty: empty,
                        option: option
                    });
                });
            }).catch(function(err) {
                console.error(err);
                res.status(500).send(err);
            });
        }).catch(function(err) {
            console.error(err);
            res.status(500).send(err);
        });
    }).catch(function(err) {
        console.error(err);
        res.status(500).send(err);
    });
});

router.get('/set_status/:id_environment/:status/:id_new_status', block_access.actionAccessMiddleware("environment", "read"), block_access.statusGroupAccess, function(req, res) {
    status_helper.setStatus('e_environment', req.params.id_environment, req.params.status, req.params.id_new_status, req.session.passport.user.id, req.query.comment).then(()=> {
        res.redirect(req.headers.referer);
    }).catch((err)=> {
        entity_helper.error(err, req, res, '/environment/show?id=' + req.params.id_environment, "e_environment");
    });
});

router.post('/search', block_access.actionAccessMiddleware('environment', 'read'), function(req, res) {
    var search = '%' + (req.body.search || '') + '%';
    var limit = SELECT_PAGE_SIZE;
    var offset = (req.body.page - 1) * limit;

    // ID is always needed
    if (req.body.searchField.indexOf("id") == -1)
        req.body.searchField.push('id');

    var where = {
        raw: true,
        attributes: req.body.searchField,
        where: {}
    };
    if (search != '%%') {
        if (req.body.searchField.length == 1) {
            where.where[req.body.searchField[0]] = {
                $like: search
            };
        } else {
            where.where.$or = [];
            for (var i = 0; i < req.body.searchField.length; i++) {
                if (req.body.searchField[i] != "id") {
                    var currentOrObj = {};
                    if(req.body.searchField[i].indexOf(".") != -1){
                        currentOrObj["$"+req.body.searchField[i]+"$"] = {
                            $like: search
                        }
                    } else {
                        currentOrObj[req.body.searchField[i]] = {
                            $like: search
                        }
                    }
                    where.where.$or.push(currentOrObj);
                }
            }
        }
    }

    // Example custom where in select HTML attributes, please respect " and ':
    // data-customwhere='{"myField": "myValue"}'

    // Notice that customwhere feature do not work with related to many field if the field is a foreignKey !

    // Possibility to add custom where in select2 ajax instanciation
    if (typeof req.body.customwhere !== "undefined"){
        // If customwhere from select HTML attribute, we need to parse to object
        if(typeof req.body.customwhere === "string")
            req.body.customwhere = JSON.parse(req.body.customwhere);
        for (var param in req.body.customwhere) {
            // If the custom where is on a foreign key
            if (param.indexOf("fk_") != -1) {
                for (var option in options) {
                    // We only add where condition on key that are standard hasMany relation, not belongsToMany association
                    if ((options[option].foreignKey == param || options[option].otherKey == param) && options[option].relation != "belongsToMany"){
                        // Where on include managment if fk
                        if(param.indexOf(".") != -1){
                            where.where["$"+param+"$"] = req.body.customwhere[param];
                        } else {
                            where.where[param] = req.body.customwhere[param];
                        }
                    }
                }
            } else {
                if(param.indexOf(".") != -1){
                    where.where["$"+param+"$"] = req.body.customwhere[param];
                } else {
                    where.where[param] = req.body.customwhere[param];
                }
            }
        }
    }

    where.offset = offset;
    where.limit = limit;

    // If you need to show fields in the select that are in an other associate entity
    // You have to include those entity here
    // where.include = [{model: models.E_myentity, as: "r_myentity"}]

    models.E_environment.findAndCountAll(where).then(function(results) {
        results.more = results.count > req.body.page * SELECT_PAGE_SIZE ? true : false;
        // Format value like date / datetime / etc...
        for (var field in attributes)
            for (var i = 0; i < results.rows.length; i++)
                for (var fieldSelect in results.rows[i])
                    if(fieldSelect == field)
                        switch(attributes[field].newmipsType) {
                            case "date":
                                if(results.rows[i][fieldSelect] && results.rows[i][fieldSelect] != "")
                                    results.rows[i][fieldSelect] = moment(results.rows[i][fieldSelect]).format(req.session.lang_user == "fr-FR" ? "DD/MM/YYYY" : "YYYY-MM-DD")
                                break;
                            case "datetime":
                                if(results.rows[i][fieldSelect] && results.rows[i][fieldSelect] != "")
                                    results.rows[i][fieldSelect] = moment(results.rows[i][fieldSelect]).format(req.session.lang_user == "fr-FR" ? "DD/MM/YYYY HH:mm" : "YYYY-MM-DD HH:mm")
                                break;
                        }

        res.json(results);
    }).catch(function(e) {
        console.error(e);
        res.status(500).json(e);
    });
});

router.post('/fieldset/:alias/remove', block_access.actionAccessMiddleware("environment", "delete"), function(req, res) {
    var alias = req.params.alias;
    var idToRemove = req.body.idRemove;
    var idEntity = req.body.idEntity;
    models.E_environment.findOne({
        where: {
            id: idEntity
        }
    }).then(function(e_environment) {
        if (!e_environment) {
            var data = {
                error: 404
            };
            return res.render('common/error', data);
        }

        // Get all associations
        e_environment['remove' + entity_helper.capitalizeFirstLetter(alias)](idToRemove).then(aliasEntities => {

            if(globalConfig.env == "tablet"){
                let target = "";
                for (let i = 0; i < options.length; i++)
                    if (options[i].as == alias)
                        {target = options[i].target; break;}
                entity_helper.synchro.writeJournal({
                    verb: "associate",
                    id: idEntity,
                    target: target,
                    entityName: "e_environment",
                    func: 'remove' + entity_helper.capitalizeFirstLetter(alias),
                    ids: idToRemove
                });
            }

            res.sendStatus(200).end();
        }).catch(function(err) {
            entity_helper.error(err, req, res, "/", "e_environment");
        });
    }).catch(function(err) {
        entity_helper.error(err, req, res, "/", "e_environment");
    });
});

router.post('/fieldset/:alias/add', block_access.actionAccessMiddleware("environment", "create"), function(req, res) {
    var alias = req.params.alias;
    var idEntity = req.body.idEntity;
    models.E_environment.findOne({
        where: {
            id: idEntity
        }
    }).then(function(e_environment) {
        if (!e_environment) {
            var data = {
                error: 404
            };
            logger.debug("No data entity found.");
            return res.render('common/error', data);
        }

        var toAdd;
        if (typeof(toAdd = req.body.ids) === 'undefined') {
            req.session.toastr.push({
                message: 'message.create.failure',
                level: "error"
            });
            return res.redirect('/environment/show?id=' + idEntity + "#" + alias);
        }

        e_environment['add' + entity_helper.capitalizeFirstLetter(alias)](toAdd).then(function() {
            res.redirect('/environment/show?id=' + idEntity + "#" + alias);
        }).catch(function(err) {
            entity_helper.error(err, req, res, "/", "e_environment");
        });
    }).catch(function(err) {
        entity_helper.error(err, req, res, "/", "e_environment");
    });
});

router.post('/delete', block_access.actionAccessMiddleware("environment", "delete"), function(req, res) {
    var id_e_environment = parseInt(req.body.id);

    models.E_environment.findOne({
        where: {
            id: id_e_environment
        }
    }).then(function(deleteObject) {
        if (!deleteObject) {
            data.error = 404;
            logger.debug("No data entity found.");
            return res.render('common/error', data);
        }

        portainerAPI.deleteStack(deleteObject.f_name).then(err => {

            deleteObject.destroy().then(function() {
                req.session.toastr = [{
                    message: 'message.delete.success',
                    level: "success"
                }];

                var redirect = '/environment/list';
                if (typeof req.body.associationFlag !== 'undefined')
                    redirect = '/' + req.body.associationUrl + '/show?id=' + req.body.associationFlag + '#' + req.body.associationAlias;
                res.redirect(redirect);
                entity_helper.removeFiles("e_environment", deleteObject, attributes);
            }).catch(function(err) {
                entity_helper.error(err, req, res, '/environment/list', "e_environment");
            });

        }).catch(function(err) {
            console.error("ERROR WHILE DELETING STUDIO STACK")
            console.log(err);
            req.session.toastr = [{
                message: "Une erreur s'est produite lors de la suppression de la stack sur Portainer.",
                level: "error"
            }];
            return res.redirect("/environment/list");
        });
    }).catch(function(err) {
        entity_helper.error(err, req, res, '/environment/list', "e_environment");
    });
});

module.exports = router;