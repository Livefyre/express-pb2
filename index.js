var ProtoBuf = require('protobufjs');
var serializers = require('./lib/serializers.js')
var express = require("express");
var methods = require("methods");

var METHOD_TYPES = ["Service.Method", "Service.RPCMethod"]
var ROUTE_OPTION_KEYS = ["(expresspb2.options.route)", "(options.route)"]

var protobufServiceApi = function(service) {
    var router = new express.Router();
    var children = service.getChildren();
    var methodsByName = {};

    children.forEach(function(child) {
        if (METHOD_TYPES.indexOf(child.className) == -1) {
            return;
        }
        methodsByName[child.name.toLowerCase()] = child;
    });

    var route;
    ROUTE_OPTION_KEYS.forEach(function(key) {
        route = route || service.getOption(key);
    });
    if (!route) {
        throw "Service must include routes"
    }

    methods.concat('all').forEach(function(method) {
        var ex = router[method];
        router[method] = function() {
            if (!methodsByName[method]) {
                throw (method + " not supported.");
            }
            var args = Array.prototype.concat.apply([route], arguments);
            args = Array.prototype.slice.call(args);
            ex.apply(router, args);
        }
    });

    router.use(function(req, res, next) {
        var method = methodsByName[req.method.toLowerCase()];
        if (!method) {
            next();
            return;
        }

        var proto = new (method.resolvedRequestType.build());
        proto.$set(req.body);
        req.proto = proto;

        var superJson = res.json;
        var json = function(chunk, encoding, callback) {
            if (chunk.$type) {
                chunk = serializers.toObject(chunk);
            }
            superJson.call(this, chunk, encoding, callback);
        }

        res.json = json;
        next();
    });

    return router;
};

module.exports = {
    protobufServiceApi: protobufServiceApi
};