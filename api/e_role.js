var express = require('express');
var router = express.Router();
var block_access = require('../utils/block_access');

var models = require('../models/');
var attributes = require('../models/attributes/e_role');
var options = require('../models/options/e_role');
var model_builder = require('../utils/model_builder');
var enums_radios = require('../utils/enum_radio.js');
var entity_helper = require('../utils/entity_helper');

//
// FIND ALL
//
router.get('/', function(req, res) {
    var answer = {
        limit: parseInt(req.query.limit || 50),
        offset: parseInt(req.query.offset || 0),
        error: null
    };

    // Build include from query parameter: `?include=r_asso1,r_asso2`
    var include = [];
    if (req.query.include) {
        var queryIncludes = req.query.include.split(',');
        for (var i = 0; i < queryIncludes.length; i++)
            for (var j = 0; j < options.length; j++)
                if (queryIncludes[i] == options[j].as)
                    include.push({
                        model: models[entity_helper.capitalizeFirstLetter(options[j].target)],
                        as: options[j].as
                    });
    }
    var query = {limit: answer.limit, offset: answer.offset};
    if (include.length)
        query.include = include;

    var where = {};
    for (var field in req.query)
        if ((field.indexOf('f_') == 0 && attributes[field]) || field.indexOf('fk_id_') == 0)
            where[field] = req.query[field];
    if (Object.keys(where).length)
        query.where = where;

    models.E_role.findAndCountAll(query).then(function(e_roles) {
        answer["e_roles".substring(2)] = e_roles.rows || [];
        answer.totalCount = e_roles.count;
        answer.rowsCount = answer["e_roles".substring(2)].length;

        res.status(200).json(answer);
    }).catch(function(err) {
        answer.error = err;
        res.status(500).json(answer);
    });
});

//
// FIND ONE
//
router.get('/:id', function(req, res) {
    var answer = {
        error: null
    };
    var id_e_role = parseInt(req.params.id);

    // Build include from query parameter: `?include=r_asso1,r_asso2`
    var include = [];
    if (req.query.include) {
        var queryIncludes = req.query.include.split(',');
        for (var i = 0; i < queryIncludes.length; i++)
            for (var j = 0; j < options.length; j++)
                if (queryIncludes[i] == options[j].as)
                    include.push({
                        model: models[entity_helper.capitalizeFirstLetter(options[j].target)],
                        as: options[j].as
                    });
    }
    var query = {limit: answer.limit, offset: answer.offset, };
    if (include.length)
        query.include = include;

    var where = {id: id_e_role};
    for (var field in req.query)
        if ((field.indexOf('f_') == 0 && attributes[field]) || field.indexOf('fk_id_') == 0)
            where[field] = req.query[field];
    query.where = where;

    models.E_role.findOne(query).then(function(e_role) {
        if (!e_role) {
            answer.error = "No e_role with ID "+id_e_role;
            return res.status(404).json(answer);
        }
        answer["e_role".substring(2)] = e_role;

        res.status(200).json(answer);
    }).catch(function(err){
        answer.error = err;
        res.status(500).json(answer);
    });
});

//
// FIND ASSOCIATION
//
router.get('/:id/:association', function(req, res) {
    var answer = {
        error: null,
        limit: parseInt(req.query.limit || 50),
        offset: parseInt(req.query.offset || 0)
    };
    var id_e_role = req.params.id;
    var association = req.params.association;

    var include = null;
    for (var i = 0; i < options.length; i++) {
        if (options[i].as == 'r_' + association) {
            if (options[i].relation.toLowerCase().indexOf('many') != -1) {
                include = {
                    model: models[entity_helper.capitalizeFirstLetter(options[i].target)],
                    as: options[i].as
                };
                delete answer.limit;
                delete answer.offset;
            }
            else
                include = {
                    model: models[entity_helper.capitalizeFirstLetter(options[i].target)],
                    as: options[i].as,
                    limit: answer.limit,
                    offset: answer.offset
                }
            break;
        }
    }

    if (include == null) {
        answer.error = "No association with "+association;
        return res.status(404).json(answer);
    }

    var where = {};
    for (var field in req.query)
        if (field.indexOf('f_') == 0)
            where[field] = req.query[field];
    if (Object.keys(where).length)
        include.where = where;

    models.E_role.findOne({
        where: {id: id_e_role},
        include: include
    }).then(function(e_role) {
        if (!e_role) {
            answer.error = "No e_role with ID "+id_e_role;
            return res.status(404).json(answer);
        }
        answer[association] = e_role[include.as];

        res.status(200).json(answer);
    }).catch(function(err){
        answer.error = err;
        res.status(500).json(answer);
    });
});

//
// CREATE
//
router.post('/', function(req, res) {
    var answer = {
        error: null
    };

    var createObject = model_builder.buildForRoute(attributes, options, req.body);

    models.E_role.create(createObject).then(function(e_role) {
        answer["e_role".substring(2)] = e_role;

        // Set associations
        var associationPromises = [];
        for (var prop in req.body)
            if (prop.indexOf('r_') == 0) {
                if (e_role['set'+entity_helper.capitalizeFirstLetter(prop)] !== 'undefined')
                    associationPromises.push(e_role['set'+entity_helper.capitalizeFirstLetter(prop)](req.body[prop]));
                else
                    console.error("API: Couldn't set association.\nAPI: e_role.set"+entity_helper.capitalizeFirstLetter(prop)+"() is undefined.");
            }

        Promise.all(associationPromises).then(function() {
            res.status(200).json(answer);
        }).catch(function(err) {
            answer.error = "Error with associations";
            res.status(500).json(answer);
        });
    }).catch(function(err){
        answer.error = err;
        res.status(500).json(answer);
    });
});

//
// UPDATE
//
router.put('/:id', function(req, res) {
    var answer = {
        error: null
    };
    var id_e_role = parseInt(req.params.id);
    var updateObject = model_builder.buildForRoute(attributes, options, req.body);

    // Fetch e_role to update
    models.E_role.findOne({where: {id: id_e_role}}).then(function(e_role) {
        if (!e_role) {
            answer.error = "No e_role with ID "+id_e_role;
            return res.status(404).json(answer);
        }

        // Update e_role
        e_role.update(updateObject, {where: {id: id_e_role}}).then(function() {
            answer["e_role".substring(2)] = e_role;

            // Set associations
            var associationPromises = [];
            for (var prop in req.body)
                if (prop.indexOf('r_') == 0) {
                    if (e_role['set'+entity_helper.capitalizeFirstLetter(prop)] !== 'undefined')
                        associationPromises.push(e_role['set'+entity_helper.capitalizeFirstLetter(prop)](req.body[prop]));
                    else
                        console.error("API: Couldn't set association.\nAPI: e_role.set"+entity_helper.capitalizeFirstLetter(prop)+"() is undefined.");
                }

            Promise.all(associationPromises).then(function() {
                res.status(200).json(answer);
            }).catch(function(err) {
                answer.error = "Error with associations";
                res.status(500).json(answer);
            });
        }).catch(function(err){
            answer.error = err;
            res.status(500).json(answer);
        });
    }).catch(function(err){
        answer.error = err;
        res.status(500).json(answer);
    });
});

//
// DELETE
//
router.delete('/:id', function(req, res) {
    var answer = {
        error: null
    }
    var id_e_role = req.params.id;

    models.E_role.destroy({where: {id: id_e_role}}).then(function() {
        res.status(200).end();
    }).catch(function(err){
        answer.error = err;
        res.status(500).json(answer);
    });
});

module.exports = router;
