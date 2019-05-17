var builder = require('../utils/model_builder');
var fs = require('fs-extra');

var attributes_origin = require("./attributes/e_api_credentials.json");
var associations = require("./options/e_api_credentials.json");

module.exports = (sequelize, DataTypes) => {
    var attributes = builder.buildForModel(attributes_origin, DataTypes);
    builder.attributesValidation(attributes);
    var options = {
        tableName: '1_e_api_credentials',
        timestamps: true
    };

    var Model = sequelize.define('E_api_credentials', attributes, options);
    Model.associate = builder.buildAssociation('E_api_credentials', associations);
    builder.addHooks(Model, 'e_api_credentials', attributes_origin);

    return Model;
};