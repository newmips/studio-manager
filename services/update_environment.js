const models = require('../models/');
const request = require('request-promise');

module.exports = () => {
	(async () => {

		let conf = await models.E_configuration.findOne({
			where: {
				id: 1
			}
		});

		let callResults = await request({
		    uri: conf.f_portainer_api_url + "/auth",
		    method: 'POST',
		    headers: {
			    'Content-Type': 'application/json'
			},
		    body: {
		        Username: conf.f_portainer_login,
		        Password: conf.f_portainer_password
		    },
			json: true // Automatically stringifies the body to JSON
		});

		// Full token
		let token = "Bearer "+ callResults.jwt;

		let allContainers = await request({
		    uri: conf.f_portainer_api_url + "/endpoints/1/docker/containers/json",
		    method: "GET",
		    headers: {
			    'Content-Type': 'multipart/form-data',
			    'Authorization': token
			},
	    	json: true
		});

		// Looking for our container ID
		let stack, stacksDone = [], containers, ipAdresses, environment, url = "";
		for (var i = 0; i < allContainers.length; i++) {

			stack = allContainers[i].Labels['com.docker.compose.project'];

			if(typeof stack !== "undefined" && stack != "traefik" && stacksDone.indexOf(stack) == -1){

				containers = allContainers.filter(x => {
					return x.Labels['com.docker.compose.project'] == stack
				});

				ipAdresses = {
					container: "",
					database: ""
				}

				containers.map(x => {
					if(x.Names[0].indexOf("database") != -1){
						ipAdresses.database = x.NetworkSettings.Networks.proxy.IPAddress
						return true;
					} else {
						ipAdresses.container = x.NetworkSettings.Networks.proxy.IPAddress;
						url = x.Labels["traefik.frontend.rule"].split("Host:")[1]
						return true;
					}
				});

				environment = await models.E_environment.findOne({
					where : {
						f_name: stack
					}
				});

				if(!environment)
					await models.E_environment.create({
						f_name: stack,
						f_container_ip: ipAdresses.container,
						f_database_ip: ipAdresses.database,
						f_url: "http://" + url
					})
				else
					await environment.update({
						f_container_ip: ipAdresses.container,
						f_database_ip: ipAdresses.database,
						f_url: "http://" + url
					})

				stacksDone.push(stack)
			}
		}

		return;
	})().then(_ => {
		console.log("UPDATE ENVIRONMENT DONE.");
	}).catch(err => {
		console.error("ERROR WHILE UPDATING ENVIRONMENT LIST:", err.message)
	})
};