var builder = require('../utils/model_builder');
var fs = require('fs-extra');

var attributes_origin = require("./attributes/e_configuration.json");
var associations = require("./options/e_configuration.json");

module.exports = (sequelize, DataTypes) => {
    var attributes = builder.buildForModel(attributes_origin, DataTypes);
    builder.attributesValidation(attributes);
    var options = {
        tableName: '1_e_configuration',
        timestamps: true
    };

    var Model = sequelize.define('E_configuration', attributes, options);
    Model.associate = builder.buildAssociation('E_configuration', associations);
    builder.addHooks(Model, 'e_configuration', attributes_origin);

    return Model;
};