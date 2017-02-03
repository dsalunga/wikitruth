'use strict';

var mongoose    = require('mongoose'),
    utils       = require('../utils/utils'),
    flowUtils   = require('../utils/flowUtils'),
    paths       = require('../models/paths'),
    templates   = require('../models/templates'),
    constants   = require('../models/constants'),
    db          = require('../app').db.models;

function GET_entry(req, res) {
    var model = {};
    if(!req.query.opinion) {
        if(req.params.id) {
            req.query.opinion = req.params.id;
        } else {
            req.query.opinion = req.params.friendlyUrl;
        }
    }
    flowUtils.setEntryModels(flowUtils.createOwnerQueryFromQuery(req), req, model, function (err) {
        flowUtils.setModelOwnerEntry(model);
        flowUtils.setModelContext(req, model);
        res.render(templates.truth.opinions.entry, model);
    });
}

function GET_index(req, res) {
    var model = {};
    var query = flowUtils.createOwnerQueryFromQuery(req);
    if(query.ownerId) {
        flowUtils.setScreeningModel(req, model);
        flowUtils.setEntryModels(query, req, model, function (err) {
            query = flowUtils.createOwnerQueryFromModel(model);
            query['screening.status'] = model.screening.status;
            db.Opinion
                .find(query)
                .sort({title: 1})
                .lean()
                .exec(function (err, results) {
                flowUtils.setEditorsUsername(results, function() {
                    results.forEach(function (result) {
                        flowUtils.appendEntryExtra(result);
                    });
                    flowUtils.setModelOwnerEntry(model);
                    flowUtils.setModelContext(req, model);
                    model.opinions = results;
                    model.childrenCount = model.entry.childrenCount.opinions;
                    if(model.childrenCount.pending === 0 && model.childrenCount.rejected === 0) {
                        model.screening.hidden = true;
                    }
                    res.render(templates.truth.opinions.index, model);
                });
            });
        });
    } else {
        // Top Opinions
        db.Opinion
            .find({ ownerType: constants.OBJECT_TYPES.topic, 'screening.status': constants.SCREENING_STATUS.status1.code })
            .limit(100)
            .lean()
            .exec(function(err, results) {
            flowUtils.setEditorsUsername(results, function() {
                results.forEach(function (result) {
                    result.topic = {
                        _id: result.ownerId
                    };
                    flowUtils.appendEntryExtra(result);
                });
                model.opinions = results;
                flowUtils.setModelContext(req, model);
                res.render(templates.truth.opinions.index, model);
            });
        });
    }
}

function GET_create(req, res) {
    var model = {};
    flowUtils.setEntryModels(flowUtils.createOwnerQueryFromQuery(req), req, model, function (err) {
        flowUtils.setModelContext(req, model);
        res.render(templates.truth.opinions.create, model);
    });
}

function POST_create(req, res) {
    var query = { _id: req.query.opinion || new mongoose.Types.ObjectId() };
    db.Opinion.findOne(query, function(err, result) {
        var dateNow = Date.now();
        var entity = result ? result : {};
        entity.title = req.body.title;
        entity.content = req.body.content;
        entity.friendlyUrl = utils.urlify(req.body.title);
        entity.editUserId = req.user.id;
        entity.editDate = dateNow;
        if(!result) {
            entity.createUserId = req.user.id;
            entity.createDate = dateNow;
            flowUtils.initScreeningStatus(req, entity);
        }
        entity.private = req.params.username ? true : false;
        if(!entity.ownerId) {
            if(req.query.argument) {
                entity.ownerId = req.query.argument;
                entity.ownerType = constants.OBJECT_TYPES.argument;
            } else if(req.query.question) {
                entity.ownerId = req.query.question;
                entity.ownerType = constants.OBJECT_TYPES.question;
            } else if(req.query.topic) { // parent is a topic
                entity.ownerId = req.query.topic;
                entity.ownerType = constants.OBJECT_TYPES.topic;
            }
        }
        db.Opinion.findOneAndUpdate(query, entity, { upsert: true, new: true, setDefaultsOnInsert: true }, function (err, updatedEntity) {
            var updateRedirect = function () {
                var model = {};
                flowUtils.setModelContext(req, model);
                var url = model.wikiBaseUrl + paths.truth.opinions.entry + '/' + updatedEntity.friendlyUrl + '/' + updatedEntity._id;
                res.redirect(url);
                /*res.redirect((result ? paths.truth.opinions.entry : paths.truth.opinions.index) +
                 '?topic=' + req.query.topic +
                 (req.query.argument ? '&argument=' + req.query.argument : '') +
                 (result ? '&opinion=' + req.query.opinion : '')
                 );*/
            };
            if(!result) { // if new entry, update parent children count
                flowUtils.updateChildrenCount(entity.ownerId, entity.ownerType, constants.OBJECT_TYPES.opinion, function () {
                    updateRedirect();
                });
            } else {
                updateRedirect();
            }
        });
    });
}

module.exports = function (router) {

    /* Opinions */

    router.get('/', function (req, res) {
        GET_index(req, res);
    });

    router.get('/entry(/:friendlyUrl)?(/:friendlyUrl/:id)?', function (req, res) {
        GET_entry(req, res);
    });

    router.get('/create', function (req, res) {
        GET_create(req, res);
    });

    router.post('/create', function (req, res) {
        POST_create(req, res);
    });
};

module.exports.GET_entry = GET_entry;
module.exports.GET_index = GET_index;
module.exports.GET_create = GET_create;
module.exports.POST_create = POST_create;