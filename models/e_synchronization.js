var builder = require('../utils/model_builder');
var fs = require('fs-extra');

var attributes_origin = require("./attributes/e_synchronization.json");
var associations = require("./options/e_synchronization.json");

module.exports = (sequelize, DataTypes) => {
    var attributes = builder.buildForModel(attributes_origin, DataTypes);
    builder.attributesValidation(attributes);
    var options = {
        tableName: '1_e_synchronization',
        timestamps: true
    };

    var Model = sequelize.define('E_synchronization', attributes, options);
    Model.associate = builder.buildAssociation('E_synchronization', associations);
    builder.addHooks(Model, 'e_synchronization', attributes_origin);

    return Model;
};