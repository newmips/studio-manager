var express = require('express');
var router = express.Router();
var block_access = require('../utils/block_access');
// Datalist
var filterDataTable = require('../utils/filter_datatable');

// Sequelize
var models = require('../models/');
var attributes = require('../models/attributes/e_configuration');
var options = require('../models/options/e_configuration');
var model_builder = require('../utils/model_builder');
var entity_helper = require('../utils/entity_helper');
var file_helper = require('../utils/file_helper');
var status_helper = require('../utils/status_helper');
var component_helper = require('../utils/component_helper');
var globalConfig = require('../config/global');
var fs = require('fs-extra');
var dust = require('dustjs-linkedin');
var moment = require("moment");
var SELECT_PAGE_SIZE = 10;

// Enum and radio managment
var enums_radios = require('../utils/enum_radio.js');

// Winston logger
var logger = require('../utils/logger');

router.get('/update_form', block_access.actionAccessMiddleware("configuration", "update"), function(req, res) {
    var id_e_configuration = 1;
    var data = {
        enum_radio: enums_radios.translated("e_configuration", req.session.lang_user, options)
    };

    if (typeof req.query.associationFlag !== 'undefined') {
        data.associationFlag = req.query.associationFlag;
        data.associationSource = req.query.associationSource;
        data.associationForeignKey = req.query.associationForeignKey;
        data.associationAlias = req.query.associationAlias;
        data.associationUrl = req.query.associationUrl;
    }

    entity_helper.optimizedFindOne('E_configuration', id_e_configuration, options).then(function(e_configuration) {
        if (!e_configuration) {
            data.error = 404;
            return res.render('common/error', data);
        }

        e_configuration.dataValues.enum_radio = data.enum_radio;
        data.e_configuration = e_configuration;
        // Update some data before show, e.g get picture binary
        entity_helper.getPicturesBuffers(e_configuration, "e_configuration", true).then(function() {
            // Get association data that needed to be load directly here (to do so set loadOnStart param to true in options).
            entity_helper.getLoadOnStartData(req.query.ajax ? e_configuration.dataValues : data, options).then(function(data) {
                if (req.query.ajax) {
                    e_configuration.dataValues = data;
                    res.render('e_configuration/update_fields', e_configuration.get({
                        plain: true
                    }));
                } else
                    res.render('e_configuration/update', data);
            }).catch(function(err) {
                entity_helper.error(err, req, res, "/", "e_configuration");
            })
        }).catch(function(err) {
            entity_helper.error(err, req, res, "/", "e_configuration");
        })
    }).catch(function(err) {
        entity_helper.error(err, req, res, "/", "e_configuration");
    })
});

router.post('/update', block_access.actionAccessMiddleware("configuration", "update"), function(req, res) {
    var id_e_configuration = parseInt(req.body.id);

    if (typeof req.body.version !== "undefined" && req.body.version != null && !isNaN(req.body.version) && req.body.version != '')
        req.body.version = parseInt(req.body.version) + 1;
    else
        req.body.version = 0;

    var updateObject = model_builder.buildForRoute(attributes, options, req.body);

    models.E_configuration.findOne({
        where: {
            id: id_e_configuration
        }
    }).then(function(e_configuration) {
        if (!e_configuration) {
            data.error = 404;
            logger.debug("Not found - Update");
            return res.render('common/error', data);
        }
        component_helper.updateAddressIfComponentExist(e_configuration, options, req.body);
        e_configuration.update(updateObject).then(function() {

            // We have to find value in req.body that are linked to an hasMany or belongsToMany association
            // because those values are not updated for now
            model_builder.setAssocationManyValues(e_configuration, req.body, updateObject, options).then(function() {

                var redirect = '/configuration/update_form';
                req.session.toastr = [{
                    message: 'message.update.success',
                    level: "success"
                }];

                res.redirect(redirect);
            }).catch(function(err) {
                entity_helper.error(err, req, res, '/configuration/update_form', "e_configuration");
            });
        }).catch(function(err) {
            entity_helper.error(err, req, res, '/configuration/update_form', "e_configuration");
        });
    }).catch(function(err) {
        entity_helper.error(err, req, res, '/configuration/update_form', "e_configuration");
    });
});

module.exports = router;