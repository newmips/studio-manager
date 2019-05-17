var builder = require('../utils/model_builder');
var fs = require('fs-extra');

var attributes_origin = require("./attributes/e_inline_help.json");
var associations = require("./options/e_inline_help.json");

module.exports = (sequelize, DataTypes) => {
    var attributes = builder.buildForModel(attributes_origin, DataTypes);
    builder.attributesValidation(attributes);
    var options = {
        tableName: '1_e_inline_help',
        timestamps: true
    };

    var Model = sequelize.define('E_inline_help', attributes, options);
    Model.associate = builder.buildAssociation('E_inline_help', associations);
    builder.addHooks(Model, 'e_inline_help', attributes_origin);

    return Model;
};