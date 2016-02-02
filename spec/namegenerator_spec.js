/*global
  describe: true,
  it: true,
  expect: true
 */

var _ = require("lodash"),
    expect = require("chai").expect,
    nameGenerator = require("../lib/namegenerator"),
    noColorStrategy = {
        adjectives: ["simple"],
        nouns: ["goose"]
    },
    colorStrategy = {
        adjectives: ["simple"],
        colors: ["black"],
        nouns: ["goose"]
    },
    multipleStrategy = {
        adjectives: ["solid", "sturdy"],
        colors: ["red"],
        nouns: ["moose"]
    };

describe("nameGenerator", function () {
    "use strict";

    describe("#configure", function () {
        it("returns a function", function () {
            let fn = nameGenerator.configure({strategy: noColorStrategy});
            expect(true).to.equal(_.isFunction(fn));
        });
    })

    it ("returns a generated name using a custom strategy without colors", function () {
        let fn = nameGenerator.configure({strategy: noColorStrategy});
        expect(fn()).to.equal("simple-simple-goose");
    });

    it ("returns a generated name using a strategy with a colors property", function () {
        let fn = nameGenerator.configure({strategy: colorStrategy});
        expect(fn()).to.equal("black-simple-goose");
    });

    it ("returns a generated name using a strategy with multiple values", function () {
        let fn = nameGenerator.configure({strategy: multipleStrategy});

        expect(fn()).to.satisfy(function (x) {
          return (x.indexOf("solid") > -1 || x.indexOf("sturdy") > -1);
        });
    });
});
