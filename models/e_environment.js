var builder = require('../utils/model_builder');
var fs = require('fs-extra');

var attributes_origin = require("./attributes/e_environment.json");
var associations = require("./options/e_environment.json");

module.exports = (sequelize, DataTypes) => {
    var attributes = builder.buildForModel(attributes_origin, DataTypes);
    builder.attributesValidation(attributes);
    var options = {
        tableName: '1_e_environment',
        timestamps: true
    };

    var Model = sequelize.define('E_environment', attributes, options);
    Model.associate = builder.buildAssociation('E_environment', associations);
    builder.addHooks(Model, 'e_environment', attributes_origin);

    return Model;
};