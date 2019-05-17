var builder = require('../utils/model_builder');
var fs = require('fs-extra');

var attributes_origin = require("./attributes/e_notification.json");
var associations = require("./options/e_notification.json");

module.exports = (sequelize, DataTypes) => {
    var attributes = builder.buildForModel(attributes_origin, DataTypes);
    builder.attributesValidation(attributes);
    var options = {
        tableName: '1_e_notification',
        timestamps: true
    };

    var Model = sequelize.define('E_notification', attributes, options);
    Model.associate = builder.buildAssociation('E_notification', associations);
    builder.addHooks(Model, 'e_notification', attributes_origin);

    return Model;
};