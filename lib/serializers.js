var ProtoBuf = require('protobufjs');

var serializers = {};
var deserializers = {};

function serialize(proto) {
    var fields = proto.$type.getChildren();
    var result = {};

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
    if (value == null) {
        return;
    }
    if (field.resolvedType) {
        return serializeMessageField(proto, obj, field);
    }
    var serializer = serializers[field.type];
    return serializer ? serializer(value) : value;
}

function serializeMessageField(proto, obj, field) {
    var serializer = serializers[field.resolvedType.fqn()] || serialize;
    var value = proto.$get(field.name);
    if (!field.repeated) {
        return serializer(value);
    }

    if (value.length === 0) {
        return;
    }

    result = []
    for (var vIdx = 0; vIdx < value.length; vIdx++) {
        result.push(serializer(value[vIdx], field, obj));
    }
    return result;
}


function deserialize(obj, proto) {
    if (typeof proto === 'function') {
        proto = new proto();
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
    var value = deserializer ? deserializer(obj, proto, field) : obj[field.name];
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
    return deserializer(obj, proto, field);
}

function deserializeMessageFieldDefault(obj, proto, field) {
    var value = obj[field.name];
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

module.exports = {
    serialize: serialize,
    deserialize: deserialize,
    register: register,
    reset: reset
};