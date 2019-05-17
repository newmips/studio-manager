var builder = require('../utils/model_builder');

var attributes_origin = require("./attributes/c_documents_2756.json");
var associations = require("./options/c_documents_2756.json");

module.exports = (sequelize, DataTypes) => {
	var attributes = builder.buildForModel(attributes_origin, DataTypes);
	var options = {
		tableName: '1_c_documents_2756',
        timestamps: true
	};

    var Model = sequelize.define('C_documents_2756', attributes, options);
    Model.associate = builder.buildAssociation('C_documents_2756', associations);
    builder.addHooks(Model, 'c_documents_2756', attributes_origin);

    return Model;
};