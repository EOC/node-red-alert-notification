module.exports = function(RED) {
    var cfenv = require('cfenv');
    var services = cfenv.getAppEnv().services;
    var username, password, host = 'https://ibmnotifybm.mybluemix.net/api/alerts/v1';
    var service = cfenv.getAppEnv().getServiceCreds(/IBM Alert Notification/i);

    if (service) {
        username = service.username;
        password = service.password;
        host = service.url;
    }

    RED.httpAdmin.get('/alert_notification/vcap', function(req, res) {
        res.json(service ? {bound_service: true} : null);
    });
    
    function payloadIsValidAlert(payload) {
        /*  Alert Notification Payload Example
            {
                "What": "Rainfall alert for "+ forecast.day.fcst_valid_local,
                "Where": data._id, 
                "Severity": "Warning"}
            }
        */
        if (typeof payload.What === 'string' && typeof payload.Where === 'string' && typeof payload.Severity === 'string') {
            return true;
        }
        
        var message = 'Missing property, What, Where and Severity are required properties';
        node.error(message, msg);
        return false;
    }

    function Node(config) {
        RED.nodes.createNode(this,config);
        var node = this;

        this.on('input', function(msg) {
            username = username || this.credentials.username;
            password = password || this.credentials.password;

            if (!username || !password) {
                var message = 'Missing IBM Alert Notification credentials';
                node.error(message, msg);
                return;
            }
            
            if (!payloadIsValidAlert(msg.payload))
                return;

            var request = require('request');

            node.status({fill:"red", shape:"dot", text:"requesting"});
            
            request({url: host, auth: {username: username, password: password}, qs: {What: msg.payload.What, Where: msg.payload.Where, Severity: msg.payload.Severity}}, function(error, response, body) {
                node.status({});
                if (!error && response.statusCode == 200) {
                    var results = JSON.parse(body);
                    node.send(results);
                } else {
                    var message2 = 'IBM Alert Notification service call failed with error HTTP response.';
                    node.error(message2, msg);
                }
            });
        });
    }

    RED.nodes.registerType("alert_notification",Node, {
        credentials: {
            username: {type:"text"},
            password: {type:"password"}
        }
    });
};
