var builder = require('../utils/model_builder');
var fs = require('fs-extra');

var attributes_origin = require("./attributes/e_group.json");
var associations = require("./options/e_group.json");

module.exports = (sequelize, DataTypes) => {
    var attributes = builder.buildForModel(attributes_origin, DataTypes);
    builder.attributesValidation(attributes);
    var options = {
        tableName: '1_e_group',
        timestamps: true
    };

    var Model = sequelize.define('E_group', attributes, options);
    Model.associate = builder.buildAssociation('E_group', associations);
    builder.addHooks(Model, 'e_group', attributes_origin);

    return Model;
};