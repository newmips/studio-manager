var builder = require('../utils/model_builder');
var fs = require('fs-extra');

var attributes_origin = require("./attributes/e_robot.json");
var associations = require("./options/e_robot.json");

module.exports = (sequelize, DataTypes) => {
    var attributes = builder.buildForModel(attributes_origin, DataTypes);
    builder.attributesValidation(attributes);
    var options = {
        tableName: '1_e_robot',
        timestamps: true
    };

    var Model = sequelize.define('E_robot', attributes, options);
    Model.associate = builder.buildAssociation('E_robot', associations);
    builder.addHooks(Model, 'e_robot', attributes_origin);

    return Model;
};