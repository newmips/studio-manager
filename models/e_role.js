var builder = require('../utils/model_builder');
var fs = require('fs-extra');

var attributes_origin = require("./attributes/e_role.json");
var associations = require("./options/e_role.json");

module.exports = (sequelize, DataTypes) => {
    var attributes = builder.buildForModel(attributes_origin, DataTypes);
    builder.attributesValidation(attributes);
    var options = {
        tableName: '1_e_role',
        timestamps: true
    };

    var Model = sequelize.define('E_role', attributes, options);
    Model.associate = builder.buildAssociation('E_role', associations);
    builder.addHooks(Model, 'e_role', attributes_origin);

    return Model;
};