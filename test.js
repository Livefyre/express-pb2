var expect = require("chai").expect;
var protobufSerializer = require("./lib/serializers.js");
var ProtoBuf = require("protobufjs");
var descr = ProtoBuf.loadProtoFile("./test.proto").lookup("expresspb2.test");
var protos = ProtoBuf.loadProtoFile("./test.proto").build("expresspb2.test");
var expresspb2 = require("./index.js");
var request = require('supertest');

describe("serializers.js", function() {
    describe("toObject", function() {
        it("Serializes primitives", function(done) {
            var proto = new protos.TestSerializer();
            proto.$set("intValue", 1);
            var result = protobufSerializer.toObject(proto);
            expect(result.intValue).to.equal(1);
            done();
        });
        it("Doesn't serialize missing fields", function(done) {
            var proto = new protos.TestSerializer();
            var result = protobufSerializer.toObject(proto);
            expect(result.intValue).to.be.undefined;
            done();
        });
        it("Serializes composed obects", function(done) {
            var proto = new protos.TestSerializer();
            proto.$set("composedValue", {
                strValue: "the value"
            });
            var result = protobufSerializer.toObject(proto);
            expect(result.composedValue.strValue).to.equal("the value");
            done();
        });
        it("Serializes repeated obects", function(done) {
            var proto = new protos.TestSerializer();
            proto.add("repeatedValue", "a");
            proto.add("repeatedValue", "b");
            proto.add("repeatedComposedValue", {
                "strValue": "the value"
            })
            var result = protobufSerializer.toObject(proto);
            expect(result.repeatedValue).to.deep.equal(["a", "b"]);
            expect(result.repeatedValue).to.deep.equal(["a", "b"]);
            expect(result.repeatedComposedValue).to.deep.equal([{
                "strValue": "the value"
            }]);
            done();
        });
        it("Uses custom serializers", function(done) {
            var proto = new protos.TestSerializer();
            proto.$set("composedValue", {
                strValue: "the value"
            });

            function serializer(value, field) {
                return {
                    "customKey": value.$get("strValue")
                }
            }
            protobufSerializer.registerSerializer(protos.TestSerializer.Composed, serializer);
            var result = protobufSerializer.toObject(proto);
            expect(result.composedValue.customKey).to.equal("the value");
            protobufSerializer.reset()
            done();
        });
    });
});
