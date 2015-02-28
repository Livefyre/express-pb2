var ProtoBuf = require('protobufjs');

var serializers = {};
var deserializers = {};

function serialize(proto) {
    var result = {};

    if (serializers[proto.$type.fqn()]) {
        var maybeResult = serializers[proto.$type.fqn()](proto, result, null, module.exports);
        return maybeResult || result;
    }

    var fields = proto.$type.getChildren();

    for (var fIdx = 0; fIdx < fields.length; fIdx++) {
        var field = fields[fIdx];

        if (field.className !== "Message.Field") {
            continue;
        }

        var value = serializeField(proto, result, field);
        if (value == null) {
            continue;
        }
        result[field.name] = value;
    }

    return result;
}

function serializeField(proto, obj, field) {
    var value = proto.$get(field.name);
    if (value == null || (field.repeated && value.length === 0)) {
        return;
    }
    if (field.resolvedType) {
        return serializeMessageField(proto, obj, field);
    }
    var serializer = serializers[field.type];
    return serializer ? serializer(proto, obj, field, module.exports) : value;
}

function isEmptyObject(candidate) {
    if (candidate == null) {
        return true;
    }
    if (typeof candidate !== "object") {
        return false;
    }
    for (var key in candidate) {
        if (candidate.hasOwnProperty(key)) {
            return false;
        }
    }
    return true;
}

function serializeMessageField(proto, obj, field) {
    var serializer = serializers[field.resolvedType.fqn()] || serialize;
    var value = proto.$get(field.name);

    if (!field.repeated) {
        var serialized = serializer(value, obj, field, module.exports);
        console.log("serialized is", serialized, "isEmpty=", isEmptyObject(serialized))
        return isEmptyObject(serialized) ? null : serialized;
    }

    if (value.length === 0) {
        return;
    }

    result = []
    for (var vIdx = 0; vIdx < value.length; vIdx++) {
        var serialized = serializer(value[vIdx], obj, field, module.exports);
        if (!isEmptyObject(serialized)) {
            result.push(serialized);
        }
    }
    return result;
}


function deserialize(obj, proto) {
    if (typeof proto === 'function') {
        proto = new proto();
    }

    if (deserializers[proto.$type.fqn()]) {
        var maybeResult = deserializers[proto.$type.fqn()](obj, null, proto, null, module.exports);
        return maybeResult || proto;
    }

    var fields = proto.$type.getChildren();

    for (var fIdx = 0; fIdx < fields.length; fIdx++) {
        var field = fields[fIdx];

        if (field.className !== "Message.Field") {
            continue;
        }

        var value = deserializeField(obj, proto, field);
        if (value == null) {
            continue;
        }
        if (field.repeated) {
            for (var vIdx = 0; vIdx < value.length; vIdx++) {
                proto.$add(field.name, value[vIdx]);
            }
        } else {
            proto.$set(field.name, value);
        }
    }

    return proto;
}


function deserializeField(obj, proto, field) {
    if (field.resolvedType) {
        return deserializeMessageField(obj, proto, field);
    }

    var deserializer = deserializers[field.type];
    var value = deserializer ? deserializer(obj[field.name], obj, proto, field, module.exports) : obj[field.name];
    if (value == null) {
        return;
    }

    return value;
}

function deserializeMessageField(obj, proto, field) {
    var deserializer = deserializers[field.resolvedType.fqn()];
    if (deserializer == null) {
        deserializer = deserializeMessageFieldDefault;
    }
    return deserializer(obj[field.name], obj, proto, field, module.exports);
}

function deserializeMessageFieldDefault(value, obj, proto, field) {
    if (value == null) {
        return;
    }
    if (!field.repeated) {
        return deserialize(value, field.resolvedType.build());
    }
    if (value.length === 0) {
        return;
    }
    result = []
    for (var vIdx = 0; vIdx < value.length; vIdx++) {
        result.push(deserialize(value[vIdx], field.resolvedType.build()));
    }
    return result;
}

function simpleCustomDeserializer(wrapped) {
    return function(value, src, dest, field, expresspb2) {
        if (!field) {
            return wrapped(value, src, dest, field, expresspb2);
        }
        if (value == null) {
            return;
        }
        if (!field.repeated) {
            return wrapped(value, src, dest, field, expresspb2);
        }
        if (value.length == 0) {
            return;
        }
        var res = [];
        for (var i = 0; i < value.length; i++) {
            res.push(wrapped(value[i], src, dest, field, expresspb2));
        }
    };
}

function register(proto, serializer, deserializer) {
    if (!(proto instanceof ProtoBuf.Builder.Message)) {
        proto = new proto();
    }
    if (serializer) {
        serializers[proto.$type.fqn()] = serializer;
    }
    if (deserializer) {
        deserializers[proto.$type.fqn()] = deserializer;
    }
}

var clear = function(obj) {
    for (var key in obj) {
        delete obj[key];
    }
}

function reset() {
    clear(serializers);
    clear(deserializers);
}

module.exports.serialize = serialize;
module.exports.deserialize = deserialize;
module.exports.simpleCustomDeserializer = simpleCustomDeserializer;
module.exports.register = register;
module.exports.reset = reset;