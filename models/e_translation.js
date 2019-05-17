var builder = require('../utils/model_builder');
var fs = require('fs-extra');

var attributes_origin = require("./attributes/e_translation.json");
var associations = require("./options/e_translation.json");

module.exports = (sequelize, DataTypes) => {
    var attributes = builder.buildForModel(attributes_origin, DataTypes);
    builder.attributesValidation(attributes);
    var options = {
        tableName: '1_e_translation',
        timestamps: true
    };

    var Model = sequelize.define('E_translation', attributes, options);
    Model.associate = builder.buildAssociation('E_translation', associations);
    builder.addHooks(Model, 'e_translation', attributes_origin);

    return Model;
};