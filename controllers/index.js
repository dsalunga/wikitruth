'use strict';

var templates   = require('../models/templates'),
    paths       = require('../models/paths'),
    constants   = require('../models/constants'),
    flowUtils   = require('../utils/flowUtils'),
    utils       = require('../utils/utils'),
    db          = require('../app').db.models,
    async       = require('async');

var argumentController  = require('./arguments'),
    topicController     = require('./topics'),
    opinionController     = require('./opinions'),
    questionController     = require('./questions'),
    answerController     = require('./answers'),
    issueController     = require('./issues');

module.exports = function (router) {

    router.get('/', function (req, res) {
        var MAX_RESULT = 5;
        var model = {};
        db.User.findOne({}, function(err, result) {
            if(!result) {
                res.redirect(paths.install);
            } else {
                flowUtils.setScreeningModel(req, model);
                flowUtils.setModelContext(req, model);
                async.parallel({
                    topics: function(callback) {
                        var query = { parentId: {$ne: null}, private: false, 'screening.status': model.screening.status };
                        db.Topic
                            .find(query)
                            .sort({editDate: -1})
                            .limit(MAX_RESULT)
                            .lean()
                            .exec(function (err, results) {
                                flowUtils.setEditorsUsername(results, function() {
                                    flowUtils.setEntryParents(results, constants.OBJECT_TYPES.topic, function() {
                                        results.forEach(function(result) {
                                            flowUtils.appendEntryExtra(result);
                                        });
                                        model.topics = results;
                                        if(results.length === MAX_RESULT) {
                                            model.topicsMore = true;
                                        }
                                        callback();
                                    });
                                });
                            });
                    },
                    arguments: function(callback) {
                        var query = {
                            ownerType: constants.OBJECT_TYPES.topic,
                            private: false,
                            'screening.status': model.screening.status
                        };
                        db.Argument
                            .find(query)
                            .sort({editDate: -1})
                            .limit(MAX_RESULT)
                            .lean()
                            .exec(function (err, results) {
                                flowUtils.setEditorsUsername(results, function() {
                                    flowUtils.setEntryParents(results, constants.OBJECT_TYPES.argument, function() {
                                        results.forEach(function (result) {
                                            flowUtils.appendEntryExtra(result);
                                            flowUtils.setVerdictModel(result);
                                        });
                                        model.arguments = results;
                                        if(results.length === MAX_RESULT) {
                                            model.argumentsMore = true;
                                        }
                                        callback();
                                    });
                                });
                            });
                    },
                    questions: function(callback) {
                        var query = {
                            ownerType: constants.OBJECT_TYPES.topic,
                            private: false,
                            'screening.status': model.screening.status
                        };
                        db.Question
                            .find(query)
                            .sort({editDate: -1})
                            .limit(MAX_RESULT)
                            .lean()
                            .exec(function (err, results) {
                                flowUtils.setEntryParents(results, constants.OBJECT_TYPES.question, function() {
                                    flowUtils.setEditorsUsername(results, function () {
                                        results.forEach(function (result) {
                                            flowUtils.appendEntryExtra(result);
                                        });
                                        model.questions = results;
                                        if (results.length === MAX_RESULT) {
                                            model.questionsMore = true;
                                        }
                                        callback();
                                    });
                                });
                            });
                    },
                    answers: function(callback) {
                        db.Answer
                            .find({ private: false, 'screening.status': model.screening.status })
                            .sort({editDate: -1})
                            .limit(MAX_RESULT)
                            .lean()
                            .exec(function (err, results) {
                                flowUtils.setEntryParents(results, constants.OBJECT_TYPES.answer, function() {
                                    flowUtils.setEditorsUsername(results, function () {
                                        results.forEach(function (result) {
                                            flowUtils.appendEntryExtra(result);
                                        });
                                        model.answers = results;
                                        if (results.length === MAX_RESULT) {
                                            model.answersMore = true;
                                        }
                                        callback();
                                    });
                                });
                            });
                    },
                    issues: function (callback) {
                        db.Issue
                            .find({ private: false, 'screening.status': model.screening.status })
                            .sort({editDate: -1})
                            .limit(MAX_RESULT)
                            .lean()
                            .exec(function(err, results) {
                                flowUtils.setEntryParents(results, constants.OBJECT_TYPES.issue, function() {
                                    flowUtils.setEditorsUsername(results, function () {
                                        results.forEach(function (result) {
                                            result.issueType = constants.ISSUE_TYPES['type' + result.issueType];
                                            flowUtils.appendEntryExtra(result);
                                        });
                                        model.issues = results;
                                        if (results.length === MAX_RESULT) {
                                            model.issuesMore = true;
                                        }
                                        callback();
                                    });
                                });
                            });
                    },
                    opinions: function (callback) {
                        db.Opinion
                            .find({ private: false, 'screening.status': model.screening.status })
                            .sort({editDate: -1})
                            .limit(MAX_RESULT)
                            .lean()
                            .exec(function(err, results) {
                                flowUtils.setEntryParents(results, constants.OBJECT_TYPES.opinion, function() {
                                    flowUtils.setEditorsUsername(results, function () {
                                        results.forEach(function (result) {
                                            flowUtils.appendEntryExtra(result);
                                        });
                                        model.opinions = results;
                                        if (results.length === MAX_RESULT) {
                                            model.opinionsMore = true;
                                        }
                                        callback();
                                    });
                                });
                            });
                    }
                }, function (err, results) {
                    res.render(templates.index, model);
                });
            }
        });
        /*async.parallel({
            truth: function(callback) {
                db.Topic.find({parentId: null }).limit(3).exec(function (err, results) {
                    async.each(results, function(result, callback) {
                        result.friendlyUrl = utils.urlify(result.title);
                        result.comments = utils.numberWithCommas(utils.randomInt(1, 100000));
                        db.Topic.find( { parentId: result._id } ).limit(2).sort({ title: 1 }).exec(function(err, subtopics) {
                            subtopics.forEach(function(subtopic){
                                subtopic.friendlyUrl = utils.urlify(subtopic.title);
                            });
                            result.subtopics = subtopics;
                            callback();
                        });
                    }, function(err) {
                        model.truth = results;
                        callback();
                    });
                });
            },
            worldviews: function(callback) {
                db.Ideology.find({ parentId: null }).limit(3).sort({ title: 1 }).exec(function(err, results) {
                    async.each(results, function(result, callback) {
                        result.comments = utils.numberWithCommas(utils.randomInt(1, 100000));
                        db.Ideology.find( { parentId: result._id } ).limit(2).exec(function(err, subworldviews) {
                            result.subworldviews = subworldviews;
                            callback();
                        });
                    }, function(err) {
                        model.worldviews = results;
                        callback();
                    });
                });
            },
            morality: function(callback) {
                db.Topic.find({parentId: null}).limit(3).exec(function (err, results) {
                    async.each(results, function(result, callback) {
                        result.comments = utils.numberWithCommas(utils.randomInt(1, 100000));
                        db.Topic.find( { parentId: result._id } ).limit(2).sort({ title: 1 }).exec(function(err, subtopics) {
                            result.subtopics = subtopics;
                            callback();
                        });
                    }, function(err) {
                        model.morality = results;
                        callback();
                    });
                });
            }
        }, function (err, results) {
            // Detect if the DB has no data, if yes, redirect the user to install/1st run page.
            if(model.truth.lengh > 0) {
                res.render(templates.index, model);
            } else {
                db.User.findOne({}, function(err, result) {
                    if(!result) {
                        res.redirect(paths.install);
                    } else {
                        res.render(templates.index, model);
                    }
                });
            }
        });*/
    });

    router.get('/explore', function (req, res) {
        var MAX_RESULT = 25;
        var model = {
            tab: req.query.tab ? req.query.tab : 'topics'
        };
        flowUtils.setScreeningModel(req, model);
        flowUtils.setModelContext(req, model);
        async.parallel({
            topics: function(callback) {
                if(model.tab !== 'topics') {
                    return callback();
                }
                var query = { parentId: {$ne: null}, private: false, 'screening.status': model.screening.status };
                //db.Topic.aggregate([ {$match: query}, {$sample: { size: 25 } }, {$sort: {editDate: -1}} ], function(err, results) {
                db.Topic
                    .find(query)
                    .sort({editDate: -1})
                    .limit(MAX_RESULT)
                    .lean()
                    .exec(function (err, results) {
                        flowUtils.setEditorsUsername(results, function() {
                            flowUtils.setEntryParents(results, constants.OBJECT_TYPES.topic, function() {
                                results.forEach(function(result) {
                                    flowUtils.appendEntryExtra(result);
                                });
                                model.topics = results;
                                if(results.length > 0) {
                                    model.results = true;
                                }
                                callback();
                            });
                        });
                    });
            },
            arguments: function(callback) {
                if(model.tab !== 'arguments') {
                    return callback();
                }
                //var query = { parentId: {$ne: null}, private: false, 'screening.status': model.screening.status };
                var query = {
                    ownerType: constants.OBJECT_TYPES.topic,
                    private: false,
                    'screening.status': model.screening.status
                };
                //db.Topic.aggregate([ {$match: query}, {$sample: { size: 25 } }, {$sort: {editDate: -1}} ], function(err, results) {
                db.Argument
                    .find(query)
                    .sort({editDate: -1})
                    .limit(MAX_RESULT)
                    .lean()
                    .exec(function (err, results) {
                        flowUtils.setEditorsUsername(results, function() {
                            flowUtils.setEntryParents(results, constants.OBJECT_TYPES.argument, function () {
                                results.forEach(function (result) {
                                    flowUtils.appendEntryExtra(result);
                                    flowUtils.setVerdictModel(result);
                                });
                                model.arguments = results;
                                if (results.length > 0) {
                                    model.results = true;
                                }
                                callback();
                            });
                        });
                    });
            },
            questions: function(callback) {
                if(model.tab !== 'questions') {
                    return callback();
                }
                var query = {
                    ownerType: constants.OBJECT_TYPES.topic,
                    private: false,
                    'screening.status': model.screening.status
                };
                //db.Question.aggregate([ {$match: query}, {$sample: { size: 25 } }, {$sort: {editDate: -1}} ], function(err, results) {
                db.Question
                    .find(query)
                    .sort({editDate: -1})
                    .limit(MAX_RESULT)
                    .lean()
                    .exec(function (err, results) {
                        flowUtils.setEntryParents(results, constants.OBJECT_TYPES.question, function () {
                            flowUtils.setEditorsUsername(results, function () {
                                results.forEach(function (result) {
                                    flowUtils.appendEntryExtra(result);
                                });
                                model.questions = results;
                                if (results.length > 0) {
                                    model.results = true;
                                }
                                callback();
                            });
                        });
                    });
            },
            answers: function(callback) {
                if(model.tab !== 'answers') {
                    return callback();
                }
                //db.Answer.aggregate([ {$match: query}, {$sample: { size: 25 } }, {$sort: {editDate: -1}} ], function(err, results) {
                db.Answer
                    .find({ private: false, 'screening.status': model.screening.status })
                    .sort({editDate: -1})
                    .limit(MAX_RESULT)
                    .lean()
                    .exec(function (err, results) {
                        flowUtils.setEntryParents(results, constants.OBJECT_TYPES.answer, function () {
                            flowUtils.setEditorsUsername(results, function () {
                                results.forEach(function (result) {
                                    flowUtils.appendEntryExtra(result);
                                });
                                model.answers = results;
                                if (results.length > 0) {
                                    model.results = true;
                                }
                                callback();
                            });
                        });
                    });
            },
            issues: function (callback) {
                if(model.tab !== 'issues') {
                    return callback();
                }
                db.Issue
                    .find({ private: false, 'screening.status': model.screening.status })
                    .sort({editDate: -1})
                    .limit(MAX_RESULT)
                    .lean()
                    .exec(function(err, results) {
                        flowUtils.setEntryParents(results, constants.OBJECT_TYPES.issue, function () {
                            flowUtils.setEditorsUsername(results, function () {
                                results.forEach(function (result) {
                                    result.issueType = constants.ISSUE_TYPES['type' + result.issueType];
                                    flowUtils.appendEntryExtra(result);
                                });
                                model.issues = results;
                                if (results.length > 0) {
                                    model.results = true;
                                }
                                callback();
                            });
                        });
                    });
            },
            opinions: function (callback) {
                if(model.tab !== 'opinions') {
                    return callback();
                }
                db.Opinion
                    .find({ private: false, 'screening.status': model.screening.status })
                    .sort({editDate: -1})
                    .limit(MAX_RESULT)
                    .lean()
                    .exec(function(err, results) {
                        flowUtils.setEntryParents(results, constants.OBJECT_TYPES.opinion, function () {
                            flowUtils.setEditorsUsername(results, function () {
                                results.forEach(function (result) {
                                    flowUtils.appendEntryExtra(result);
                                });
                                model.opinions = results;
                                if (results.length > 0) {
                                    model.results = true;
                                }
                                callback();
                            });
                        });
                    });
            }/*,
            categories: function(callback) {
                flowUtils.getCategories(model, callback);
            }*/
        }, function (err, results) {
            flowUtils.setClipboardModel(req, model);
            res.render(templates.wiki.index, model);
        });
    });

    router.get('/clipboard', function (req, res) {
        var model = {};
        var clipboard = req.session.clipboard || {};
        var topicIds = clipboard['object' + constants.OBJECT_TYPES.topic];
        var argumentIds = clipboard['object' + constants.OBJECT_TYPES.argument];

        if(req.user) {
            req.params.username = req.user.username;
        }
        flowUtils.setModelContext(req, model);

        async.parallel({
            topics: function (callback) {
                if(topicIds && topicIds.length > 0) {
                    var query = {
                        _id: {
                            $in: topicIds
                        }
                    };
                    db.Topic.find(query, function(err, results) {
                        results.forEach(function (result) {
                            flowUtils.appendEntryExtra(result);
                        });
                        model.topics = results;
                        callback();
                    });
                } else {
                    callback();
                }
            },
            arguments: function (callback) {
                if(argumentIds && argumentIds.length > 0) {
                    var query = {
                        _id: {
                            $in: argumentIds
                        }
                    };
                    db.Argument.find(query, function(err, results) {
                        results.forEach(function (result) {
                            flowUtils.appendEntryExtra(result);
                        });
                        model.arguments = results;
                        callback();
                    });
                } else {
                    callback();
                }
            }
        }, function (err) {
            res.render(templates.wiki.clipboard, model);
        });
    });

    router.post('/clipboard', function (req, res) {
        var action = req.body.action;
        if(action === 'delete') {
            //var clipboard = req.session.clipboard;
            var topics = req.body.topics;
            var args = req.body.arguments;
            if(topics) {
                //var topicIds = clipboard['object' + constants.OBJECT_TYPES.topic];
                if( typeof topics === 'string' ) {
                    // single selection
                    topics = [topics];
                }
            }
            if(args) {
                //var argumentIds = clipboard['object' + constants.OBJECT_TYPES.argument];
                if( typeof args === 'string' ) {
                    // single selection
                    args = [args];
                }
            }
            res.redirect(req.originalUrl);
        }
    });


    router.get('/search', function (req, res) {
        var MAX_RESULT = 15;
        var keyword = req.query.q;
        var tab = req.query.tab ? req.query.tab : 'all';
        var model = {
            tab: tab,
            keyword: keyword,
            results: tab !== 'all'
        };
        if(!keyword) {
            return res.render(templates.search, model);
        }
        var privacyFilter = req.user ? [ { private: false }, { private: true, createUserId: req.user.id } ] : [ { private: false } ];
        if(req.user) {
            req.params.username = req.user.username;
        }
        flowUtils.setModelContext(req, model);
        async.parallel({
            topics: function(callback) {
                if(tab !== 'all' && tab !== 'topics') {
                    return callback();
                }
                db.Topic
                    .find({ $text : { $search : keyword }, $or: privacyFilter }, { score: { $meta: "textScore" } })
                    .sort({ score: { $meta: "textScore" } })
                    .limit(tab === 'all' ? MAX_RESULT : 0)
                    .lean()
                    .exec(function(err, results) {
                        if(err || !results) {
                            callback(err);
                        }
                        flowUtils.setEditorsUsername(results, function() {
                            flowUtils.setEntryParents(results, constants.OBJECT_TYPES.topic, function () {
                                results.forEach(function (result) {
                                    flowUtils.appendEntryExtra(result);
                                    //result.link = false;
                                });
                                model.topics = results;
                                if (results.length > 0) {
                                    if (results.length === MAX_RESULT) {
                                        model.topicsMore = true;
                                    }
                                    model.results = true;
                                }
                                callback();
                            });
                        });
                });
            },
            arguments: function(callback) {
                if(tab !== 'all' && tab !== 'arguments') {
                    return callback();
                }
                db.Argument
                    .find({ $text : { $search : keyword }, $or: privacyFilter }, { score: { $meta: "textScore" } })
                    .sort({ score: { $meta: "textScore" } })
                    .limit(tab === 'all' ? MAX_RESULT : 0)
                    .lean()
                    .exec(function(err, results) {
                        flowUtils.setEditorsUsername(results, function() {
                            flowUtils.setEntryParents(results, constants.OBJECT_TYPES.argument, function () {
                                results.forEach(function (result) {
                                    flowUtils.appendEntryExtra(result);
                                    flowUtils.setVerdictModel(result);
                                });
                                flowUtils.sortArguments(results);
                                model.arguments = results;
                                if (results.length > 0) {
                                    if (results.length === MAX_RESULT) {
                                        model.argumentsMore = true;
                                    }
                                    model.results = true;
                                }
                                callback();
                            });
                        });
                });
            },
            questions: function (callback) {
                if(tab !== 'all' && tab !== 'questions') {
                    return callback();
                }
                db.Question
                    .find({ $text : { $search : keyword }, $or: privacyFilter }, { score: { $meta: "textScore" } })
                    .sort({ score: { $meta: "textScore" } })
                    .limit(tab === 'all' ? MAX_RESULT : 0)
                    .lean()
                    .exec(function(err, results) {
                    flowUtils.setEditorsUsername(results, function() {
                        flowUtils.setEntryParents(results, constants.OBJECT_TYPES.question, function () {
                            results.forEach(function (result) {
                                flowUtils.appendEntryExtra(result);
                            });
                            model.questions = results;
                            if (results.length > 0) {
                                model.results = true;
                            }
                            callback();
                        });
                    });
                });
            },
            answers: function (callback) {
                if(tab !== 'all' && tab !== 'answers') {
                    return callback();
                }
                db.Answer
                    .find({ $text : { $search : keyword }, $or: privacyFilter }, { score: { $meta: "textScore" } })
                    .sort({ score: { $meta: "textScore" } })
                    .limit(tab === 'all' ? MAX_RESULT : 0)
                    .lean()
                    .exec(function(err, results) {
                        flowUtils.setEditorsUsername(results, function() {
                            flowUtils.setEntryParents(results, constants.OBJECT_TYPES.answer, function () {
                                results.forEach(function (result) {
                                    flowUtils.appendEntryExtra(result);
                                });
                                model.answers = results;
                                if (results.length > 0) {
                                    model.results = true;
                                }
                                callback();
                            });
                        });
                    });
            },
            issues: function (callback) {
                if(tab !== 'all' && tab !== 'issues') {
                    return callback();
                }
                db.Issue
                    .find({ $text : { $search : keyword }, $or: privacyFilter }, { score: { $meta: "textScore" } })
                    .sort({ score: { $meta: "textScore" } })
                    .limit(tab === 'all' ? MAX_RESULT : 0)
                    .lean()
                    .exec(function(err, results) {
                        flowUtils.setEditorsUsername(results, function() {
                            flowUtils.setEntryParents(results, constants.OBJECT_TYPES.issue, function () {
                                results.forEach(function (result) {
                                    result.issueType = constants.ISSUE_TYPES['type' + result.issueType];
                                    flowUtils.appendEntryExtra(result);
                                });
                                model.issues = results;
                                if (results.length > 0) {
                                    if (results.length === MAX_RESULT) {
                                        model.issuesMore = true;
                                    }
                                    model.results = true;
                                }
                                callback();
                            });
                        });
                });
            },
            opinions: function (callback) {
                if(tab !== 'all' && tab !== 'opinions') {
                    return callback();
                }
                db.Opinion
                    .find({ $text : { $search : keyword }, $or: privacyFilter }, { score: { $meta: "textScore" } })
                    .sort({ score: { $meta: "textScore" } })
                    .limit(tab === 'all' ? MAX_RESULT : 0)
                    .lean()
                    .exec(function(err, results) {
                        flowUtils.setEditorsUsername(results, function() {
                            flowUtils.setEntryParents(results, constants.OBJECT_TYPES.opinion, function () {
                                results.forEach(function (result) {
                                    flowUtils.appendEntryExtra(result);
                                });
                                model.opinions = results;
                                if (results.length > 0) {
                                    if (results.length === MAX_RESULT) {
                                        model.opinionsMore = true;
                                    }
                                    model.results = true;
                                }
                                callback();
                            });
                        });
                });
            }
        }, function (err, results) {
            res.render(templates.search, model);
        });
    });

    /* Entry routes mapping */

    router.get('/topic/:friendlyUrl/link/:id', function (req, res) {
        topicController.GET_link_entry(req, res);
    });

    router.get('/topic(/:friendlyUrl)?(/:friendlyUrl/:id)?', function (req, res) {
        topicController.GET_entry(req, res);
    });

    router.get('/argument/:friendlyUrl/link/:id', function (req, res) {
        argumentController.GET_link_entry(req, res);
    });

    router.get('/argument(/:friendlyUrl)?(/:friendlyUrl/:id)?', function (req, res) {
        argumentController.GET_entry(req, res);
    });

    router.get('/question(/:friendlyUrl)?(/:friendlyUrl/:id)?', function (req, res) {
        questionController.GET_entry(req, res);
    });

    router.get('/answer(/:friendlyUrl)?(/:friendlyUrl/:id)?', function (req, res) {
        answerController.GET_entry(req, res);
    });


    /* Opinions and Aliases */

    router.get('/opinion(/:friendlyUrl)?(/:friendlyUrl/:id)?', function (req, res) {
        opinionController.GET_entry(req, res);
    });

    router.get('/comment(/:friendlyUrl)?(/:friendlyUrl/:id)?', function (req, res) {
        opinionController.GET_entry(req, res);
    });

    router.get('/comments/', function (req, res) {
        opinionController.GET_index(req, res);
    });

    router.get('/comments/entry(/:friendlyUrl)?(/:friendlyUrl/:id)?', function (req, res) {
        opinionController.GET_entry(req, res);
    });

    router.get('/comments/create', function (req, res) {
        opinionController.GET_create(req, res);
    });

    router.post('/comments/create', function (req, res) {
        opinionController.POST_create(req, res);
    });


    router.get('/issue(/:friendlyUrl)?(/:friendlyUrl/:id)?', function (req, res) {
        issueController.GET_entry(req, res);
    });

    /* Visualize */
    router.get('/visualize(/topic)?(/:friendlyUrl)?(/:friendlyUrl/:id)?', function (req, res) {
        flowUtils.ensureEntryIdParam(req, 'topic');
        var model = {}, nodes = [], edges = [], node;
        var textSize = 25, nodeSize = 11;
        var ownerQuery = flowUtils.createOwnerQueryFromQuery(req);
        flowUtils.setEntryModels(ownerQuery, req, model, function (err) {
            var topicId = model.topic ? model.topic._id : null;
            async.parallel({
                visualize: function (callback) {
                    db.Topic
                        .find({
                            parentId: topicId,
                            private: false,
                            'screening.status': constants.SCREENING_STATUS.status1.code
                        })
                        .sort({title: 1})
                        .lean()
                        .exec(function (err, results) {
                            if(!topicId) {
                                topicId = '0';
                                nodes.push({id: topicId, label: 'Wikitruth', value: 10, color: '#f0ad4e', font: {size: 16}});
                            } else {
                                nodes.push({id: topicId, label: utils.getShortText(model.topic.title, textSize), value: 10, color: '#f0ad4e', font: {size: 16}});

                                // add parent
                                if(model.parentTopic) {
                                    nodes.push({id: model.parentTopic._id, label: utils.getShortText(model.parentTopic.title, textSize) + ' (up level)', value: 6, shape: 'triangle', color: '#cc317c'});
                                    edges.push({from: topicId, to: model.parentTopic._id, width: 4});
                                    if(model.grandParentTopic) {
                                        nodes.push({id: model.grandParentTopic._id, label: utils.getShortText(model.grandParentTopic.title, textSize) + ' (up two levels)', value: 4, shape: 'triangle', color: '#cc317c'});
                                        edges.push({from: model.parentTopic._id, to: model.grandParentTopic._id, width: 4});
                                    } else {
                                        nodes.push({id: '0', label: 'Wikitruth (up two levels)', value: 4, shape: 'triangle', color: '#cc317c'});
                                        edges.push({from: '0', to: model.parentTopic._id, width: 4});
                                    }
                                } else {
                                    nodes.push({id: '0', label: 'Wikitruth (up level)', value: 4, shape: 'triangle', color: '#cc317c'});
                                    edges.push({from: '0', to: topicId, width: 4});
                                }
                            }
                            var resultCounter = 0;
                            async.each(results, function (result, callback) {
                                resultCounter++;
                                if(model.topic && resultCounter === nodeSize) {
                                    node = {id: result._id, label: 'more...', value: 6, color: '#FB7E81', more: true};
                                    node.originalLabel = node.label;
                                    node.topicId = model.topic._id;
                                    node.label += ' <i>*' + model.topic.childrenCount.topics.accepted + '</i>';
                                    nodes.push(node);
                                    edges.push({from: topicId, to: result._id, width: 4});
                                    return callback();
                                }
                                result.friendlyUrl = utils.urlify(result.title);
                                result.shortTitle = utils.getShortText(result.contextTitle ? result.contextTitle : result.title, textSize);
                                nodes.push({id: result._id, label: result.shortTitle, value: 6, color: '#FB7E81'});
                                edges.push({from: topicId, to: result._id, width: 4});
                                db.Topic
                                    .find({
                                        parentId: result._id,
                                        'screening.status': constants.SCREENING_STATUS.status1.code
                                    })
                                    .limit(nodeSize)
                                    .sort({title: 1})
                                    .lean()
                                    .exec(function (err, subtopics) {
                                        if (subtopics.length > 0) {
                                            var subtopicCounter = 0;
                                            subtopics.forEach(function (subtopic) {
                                                subtopicCounter++;
                                                if(subtopicCounter === nodeSize) {
                                                    node = {id: subtopic._id, label: 'more...', value: 4, more: true};
                                                    node.originalLabel = node.label;
                                                    node.topicId = result._id;
                                                    node.label += ' <i>*' + result.childrenCount.topics.accepted + '</i>';
                                                    nodes.push(node);
                                                    edges.push({from: subtopic._id, to: result._id});
                                                    return;
                                                }
                                                subtopic.friendlyUrl = utils.urlify(subtopic.title);
                                                subtopic.shortTitle = utils.getShortText(subtopic.contextTitle ? subtopic.contextTitle : subtopic.title, textSize);
                                                node = {id: subtopic._id, label: subtopic.shortTitle, value: 4};
                                                if(subtopic.childrenCount.topics.accepted > 0) {
                                                    node.originalLabel = node.label;
                                                    node.label += ' <i>*' + subtopic.childrenCount.topics.accepted + '</i>';
                                                }
                                                nodes.push(node);
                                                edges.push({from: subtopic._id, to: result._id});
                                            });
                                            result.subtopics = subtopics;
                                            callback();
                                        } else {
                                            // if subtopics are less than 3, get some arguments
                                            var query = {
                                                parentId: null,
                                                ownerId: result._id,
                                                ownerType: constants.OBJECT_TYPES.topic,
                                                'screening.status': constants.SCREENING_STATUS.status1.code
                                            };
                                            flowUtils.getArguments(query, nodeSize, function (err, subarguments) {
                                                subarguments.forEach(function (subargument) {
                                                    flowUtils.setVerdictModel(subargument);
                                                    subargument.shortTitle = utils.getShortText(subargument.contextTitle ? subargument.contextTitle : subargument.title, textSize);
                                                    nodes.push({id: subargument._id, label: subargument.shortTitle, value: 4, shape: 'square', color: '#7BE141', type: 'argument'});
                                                    edges.push({from: subargument._id, to: result._id});
                                                });
                                                flowUtils.sortArguments(subarguments);
                                                result.subarguments = subarguments;
                                                callback();
                                            });
                                        }
                                    });
                            }, function (err) {
                                callback();
                            });
                        });
                }
            }, function (err, results) {
                model.visualize = {
                    nodes: nodes,
                    edges: edges
                };
                flowUtils.setModelOwnerEntry(model);
                flowUtils.setModelContext(req, model);
                res.render(templates.wiki.visualize, model);
            });
        });
    });

    /* Related */

    router.get('/related', function (req, res) {
        var model = {};
        flowUtils.setTopicModels(req, model, function() {
            flowUtils.setArgumentModels(req, model, function () {
                flowUtils.setQuestionModel(req, model, function () {
                    res.render(templates.wiki.related, model);
                });
            });
        });
    });

    router.get('/vash', function (req, res) {
        var model = {
            message: 'hello world!'
        };
        res.render('vash/test.vash', model);
    });
};
