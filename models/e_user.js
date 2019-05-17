var builder = require('../utils/model_builder');
var fs = require('fs-extra');

var attributes_origin = require("./attributes/e_user.json");
var associations = require("./options/e_user.json");

module.exports = (sequelize, DataTypes) => {
    var attributes = builder.buildForModel(attributes_origin, DataTypes);
    builder.attributesValidation(attributes);
    var options = {
        tableName: '1_e_user',
        timestamps: true
    };

    var Model = sequelize.define('E_user', attributes, options);
    Model.associate = builder.buildAssociation('E_user', associations);
    builder.addHooks(Model, 'e_user', attributes_origin);

    return Model;
};