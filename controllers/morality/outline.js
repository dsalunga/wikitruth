'use strict';

var flowUtils   = require('../../utils/flowUtils'),
    templates   = require('../../models/templates');

module.exports = function (router) {

    /* Outline */

    router.get('/link', function (req, res) {
        var model = {};
        flowUtils.setArgumentModel(req, model, function () {
            var query = model.argument ? { 'topic': model.argument.ownerId } : req.query;
            flowUtils.setTopicModels({query: query}, model, function () {
                //var item = model.argument ? model.argument : model.topic;
                /*var parent = null;
                if(model.argument) {

                } else if(model.topic) {

                }*/

                res.render(templates.morality.outline.linkTo, model);
            });
        });
    });

    router.get('/create', function (req, res) {
        var model = {};
        flowUtils.setTopicModels(req, model, function () {
            flowUtils.setArgumentModel(req, model, function () {
                res.render(templates.morality.outline.create, model);
            });
        });
    });
};
