var ProtoBuf = require('protobufjs');

var serializers = {};
var deserializers = {};

function defaultExtensionFn(obj, field, proto) {

}

function protobufToObject(proto, extensionFn) {
    var fields = proto.$type.getChildren();
    var result = {};

    for (var fIdx = 0; fIdx < fields.length; fIdx++) {
        var field = fields[fIdx];

        if (field.className !== "Message.Field") {
            continue;
        }

        var value = proto.$get(field.name);
        if (field.repeated && field.resolvedType) {
            if (value.length === 0) {
                continue;
            }
            result[field.name] = []
            for (var vIdx = 0; vIdx < value.length; vIdx++) {
                result[field.name].push(serializeFieldValue(value[vIdx], field));
            }
            continue;
        }

        if (value !== undefined && value !== null) {
            result[field.name] = serializeFieldValue(value, field);
        }
    }

    return result;
}

function serializeFieldValue(value, field) {
    var serializer;

    if (field.resolvedType) {
        serializer = serializers[field.resolvedType.fqn()];
        if (!serializer) {
            serializer = protobufToObject;
        }
    } else {
        serializer = serializers[field.type];
        if (!serializer) {
            return value;
        }
    }

    return serializer(value, field);
}

function registerSerializer(proto, serializer) {
    if (!(proto instanceof ProtoBuf.Builder.Message)) {
        proto = new proto();
    }
    serializers[proto.$type.fqn()] = serializer;
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
    toObject: protobufToObject,
    registerSerializer: registerSerializer,
    reset: reset
};