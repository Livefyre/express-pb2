# express-pb2
A library for building express apps based on Protobuf services.

## Example
    var protobuf = require("protobufjs");
    var expresspb2 = require("express-pb2");
    
    var builder = protobuf.loadJsonFile("./test.proto");
    var protos = builder.build("expresspb2.test");
    var service = builder.lookup("expresspb2.test").getChild("TestService");
    var api = expresspb2.protobufServiceApi(service);
    assetLibraryAssetsApi.get(function(req, res) {
        resp = new protos.TestRequest.Response();
        resp.value = "123";
        res.json(resp);
    });

