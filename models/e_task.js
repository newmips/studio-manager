var builder = require('../utils/model_builder');
var fs = require('fs-extra');

var attributes_origin = require("./attributes/e_task.json");
var associations = require("./options/e_task.json");

module.exports = (sequelize, DataTypes) => {
    var attributes = builder.buildForModel(attributes_origin, DataTypes);
    builder.attributesValidation(attributes);
    var options = {
        tableName: '1_e_task',
        timestamps: true
    };

    var Model = sequelize.define('E_task', attributes, options);
    Model.associate = builder.buildAssociation('E_task', associations);
    builder.addHooks(Model, 'e_task', attributes_origin);

    return Model;
};