var builder = require('../utils/model_builder');
var fs = require('fs-extra');

var attributes_origin = require("./attributes/e_history_e_task_s_state.json");
var associations = require("./options/e_history_e_task_s_state.json");

module.exports = (sequelize, DataTypes) => {
    var attributes = builder.buildForModel(attributes_origin, DataTypes);
    builder.attributesValidation(attributes);
    var options = {
        tableName: '1_e_history_2756_15144',
        timestamps: true
    };

    var Model = sequelize.define('E_history_e_task_s_state', attributes, options);
    Model.associate = builder.buildAssociation('E_history_e_task_s_state', associations);
    builder.addHooks(Model, 'history_e_task_s_state', attributes_origin);

    return Model;
};