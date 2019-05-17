var builder = require('../utils/model_builder');
var fs = require('fs-extra');

var attributes_origin = require("./attributes/e_action.json");
var associations = require("./options/e_action.json");

module.exports = (sequelize, DataTypes) => {
    var attributes = builder.buildForModel(attributes_origin, DataTypes);
    builder.attributesValidation(attributes);
    var options = {
        tableName: '1_e_action',
        timestamps: true
    };

    var Model = sequelize.define('E_action', attributes, options);
    Model.associate = builder.buildAssociation('E_action', associations);
    builder.addHooks(Model, 'e_action', attributes_origin);

    return Model;
};