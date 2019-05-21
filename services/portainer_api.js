const request = require('request-promise');
const json2yaml = require('json2yaml');
const models = require('../models/')

exports.generateStack = async (stackName, containerIP, databaseIP) => {

    console.log("generateStack");

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

    let composeContent = json2yaml.stringify({
        "version": "2",
        "services": {
            "newmips": {
                "depends_on": [
                    "database"
                ],
                "links": [
                    "database"
                ],
                "image": "dockside/newmips:latest",
                "networks": {
                    "proxy": {
                        "ipv4_address": containerIP
                    }
                },
                "restart": "always",
                "volumes": [
                    "workspace_data:/usr/src/app/workspace",
                    "/home/ubuntu/portainer/traefik/rules:/usr/src/app/workspace/rules"
                ],
                "environment": {
                    "HOSTNAME": stackName + conf.f_studio_domain.replace(/\./g, "-"),
                    "SUB_DOMAIN": stackName,
                    "DOMAIN_STUDIO": conf.f_studio_domain,
                    "DOMAIN_CLOUD": conf.f_cloud_domain,
                    "GITLAB_HOME": conf.f_gitlab_url,
                    "GITLAB_LOGIN": conf.f_gitlab_login,
                    "GITLAB_PRIVATE_TOKEN": conf.f_gitlab_private_token,
                    "SERVER_IP": containerIP,
                    "DATABASE_IP": databaseIP
                },
                "labels": [
                    "traefik.enable=true",
                    "traefik.frontend.rule=Host:"+ stackName + "." + conf.f_studio_domain,
                    "traefik.port=1337"
                ]
            },
            "database": {
                "image": "dockside/newmips-mysql:latest",
                "networks": {
                    "proxy": {
                        "ipv4_address": databaseIP
                    }
                },
                "volumes": [
                    "database_data:/var/lib/mysql"
                ],
                "restart": "always",
                "environment": {
                    "MYSQL_DATABASE": "newmips",
                    "MYSQL_USER": "newmips",
                    "MYSQL_PASSWORD": "newmips",
                    "MYSQL_ROOT_PASSWORD": "P@ssw0rd+"
                }
            }
        },
        "networks": {
            "proxy": {
                "external": {
                    "name": "proxy"
                }
            }
        },
        "volumes": {
            "database_data": {
                "driver": "local"
            },
            "workspace_data": {
                "driver": "local"
            }
        }
    });

    let options = {
        uri: conf.f_portainer_api_url + "/stacks",
        headers: {
            'Content-Type': 'multipart/form-data',
            'Authorization': token
        },
        qs: {
            type: 2, // Compose stack (1 is for swarm stack)
            method: "string", // Could be file or repository
            endpointId: 1
        },
        body: {
            "Name": stackName,
            "StackFileContent": composeContent
        },
        json: true // Automatically stringifies the body to JSON
    };

    console.log("CALL => Stack generation");
    let generateCall = await request.post(options);

    // Return generated stack
    return generateCall;
}

exports.deleteStack = async (stackName) => {

    console.log("deleteStack");

    let conf = await models.E_configuration.findOne({
        where: {
            id: 1
        }
    });

    let tokenCall = await request({
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
    let token = "Bearer "+ tokenCall.jwt;

    // Getting stack to delete
    let stackList = await request({
        uri: conf.f_portainer_api_url + "/stacks",
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': token
        },
        json: true // Automatically stringifies the body to JSON
    });

    // Looking for stack with given stackName
    stackList = stackList.filter(x =>x.Name == stackName);

    if(stackList.length == 0)
        throw new Error("Unable to find the stack "+stackName+" on portainer.")

    await request.delete({
        uri: conf.f_portainer_api_url + "/stacks/"+stackList[0].Id,
        headers: {
            'Content-Type': 'multipart/form-data',
            'Authorization': token
        },
        json: true // Automatically stringifies the body to JSON
    });

    let allVolumes = await request({
        uri: conf.f_portainer_api_url + "/endpoints/1/docker/volumes",
        method: "GET",
        headers: {
            'Content-Type': 'multipart/form-data',
            'Authorization': token
        },
        json: true
    });

    let promises = [];

    // Deleting linked volumes
    let volume;
    for (var i = 0; i < allVolumes.Volumes.length; i++) {
        volume = allVolumes.Volumes[i];
        if(volume.Name.indexOf(stackName + "_workspace") != -1 || volume.Name.indexOf(stackName + "_database") != -1){
            promises.push(request({
                uri: conf.f_portainer_api_url + "/endpoints/1/docker/volumes/"+volume.Name,
                method: "DELETE",
                headers: {
                    'Content-Type': 'multipart/form-data',
                    'Authorization': token
                },
                json: true
            }));
        }
    }

    await Promise.all(promises);

    return ;
}