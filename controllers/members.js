'use strict';

var mongoose    = require('mongoose'),
    templates   = require('../models/templates'),
    paths       = require('../models/paths'),
    async       = require('async'),
    flowUtils   = require('../utils/flowUtils'),
    utils       = require('../utils/utils'),
    constants   = require('../models/constants'),
    db          = require('../app').db.models;

var topicController     = require('./topics'),
    argumentController  = require('./arguments'),
    questionController  = require('./questions'),
    issueController  = require('./issues'),
    opinionController  = require('./opinions');

function setMemberModel(model, req, callback) {
    if(req.params.username) {
        if (req.user && req.user.username === req.params.username) {
            model.member = req.user;
            model.loggedIn = true;
        } else {
            return db.User.findOne({username: req.params.username}, function (err, result) {
                model.member = result;
                callback();
            });
        }
    }
    callback();
}

module.exports = function (router) {

    router.get('/', function (req, res) {
        var model = {};
        db.User.find({}).sort({title: 1}).exec(function (err, results) {
            model.contributors = results;
            res.render(templates.members.contributors, model);
        });
    });

    router.get('/reviewers', function (req, res) {
        var model = {};
        db.User.find({ 'roles.reviewer': true}).sort({title: 1}).exec(function (err, results) {
            model.reviewers = results;
            res.render(templates.members.reviewers, model);
        });
    });

    router.get('/administrators', function (req, res) {
        var model = {};
        db.User.find({ 'roles.admin': {$exists: true}}).sort({title: 1}).exec(function (err, results) {
            model.administrators = results;
            res.render(templates.members.administrators, model);
        });
    });

    router.get('/:username', function (req, res) {
        var model = {};
        setMemberModel(model, req, function() {
            async.parallel({
                topics: function(callback) {
                    db.Topic
                        .find({ createUserId: model.member._id, $or: [ { private: { $exists: false } }, { private: false } ] })
                        .count(function(err, count) {
                            model.topics = count;
                            callback();
                        });
                },
                arguments: function(callback) {
                    db.Argument
                        .find({ createUserId: model.member._id, $or: [ { private: { $exists: false } }, { private: false } ] })
                        .count(function(err, count) {
                            model.arguments = count;
                            callback();
                        });
                },
                questions: function (callback) {
                    db.Question
                        .find({ createUserId: model.member._id, $or: [ { private: { $exists: false } }, { private: false } ] })
                        .count(function(err, count) {
                            model.questions = count;
                            callback();
                        });
                },
                issues: function (callback) {
                    db.Issue
                        .find({ createUserId: model.member._id, $or: [ { private: { $exists: false } }, { private: false } ] })
                        .count(function(err, count) {
                            model.issues = count;
                            callback();
                        });
                },
                opinions: function (callback) {
                    db.Opinion
                        .find({ createUserId: model.member._id, $or: [ { private: { $exists: false } }, { private: false } ] })
                        .count(function(err, count) {
                            model.opinions = count;
                            callback();
                        });
                }
            }, function (err, results) {
                flowUtils.setModelContext(req, model);
                model.url = model.profileBaseUrl + '/contributions';
                model.contributions = model.topics + model.arguments + model.questions + model.issues + model.opinions;
                res.render(templates.members.profile.index, model);
            });
        });
    });

    router.get('/:username/contributions', function (req, res) {
        var model = {};
        setMemberModel(model, req, function () {
            var tab = req.query.tab ? req.query.tab : 'all';
            model.tab = tab;
            model.results = tab !== 'all';
            model.url = '/members/' + model.member.username + '/contributions';
            async.parallel({
                topics: function(callback) {
                    if(tab !== 'all' && tab !== 'topics') {
                        return callback();
                    }
                    db.Topic
                        .find({ createUserId: model.member._id })
                        .sort({ title: 1 })
                        .limit(tab === 'all' ? 15 : 0)
                        .lean()
                        .exec(function(err, results) {
                            if(err || !results) {
                                callback(err);
                            }
                            flowUtils.setEditorsUsername(results, function() {
                                results.forEach(function (result) {
                                    flowUtils.appendEntryExtra(result);
                                });
                                model.topics = results;
                                if(results.length > 0) {
                                    if(results.length === 15) {
                                        model.topicsMore = true;
                                    }
                                    model.results = true;
                                }
                                callback();
                            });
                        });
                },
                arguments: function(callback) {
                    if(tab !== 'all' && tab !== 'arguments') {
                        return callback();
                    }
                    db.Argument
                        .find({ createUserId: model.member._id })
                        .sort({ title: 1 })
                        .limit(tab === 'all' ? 15 : 0)
                        .lean()
                        .exec(function(err, results) {
                            flowUtils.setEditorsUsername(results, function() {
                                results.forEach(function (result) {
                                    flowUtils.appendEntryExtra(result);
                                    flowUtils.setVerdictModel(result);
                                });
                                model.arguments = results;
                                if (results.length > 0) {
                                    if(results.length === 15) {
                                        model.argumentsMore = true;
                                    }
                                    model.results = true;
                                }
                                callback();
                            });
                        });
                },
                questions: function (callback) {
                    if(tab !== 'all' && tab !== 'questions') {
                        return callback();
                    }
                    db.Question
                        .find({ createUserId: model.member._id })
                        .sort({ title: 1 })
                        .limit(tab === 'all' ? 15 : 0)
                        .exec(function(err, results) {
                            flowUtils.setEditorsUsername(results, function() {
                                results.forEach(function (result) {
                                    flowUtils.appendEntryExtra(result);
                                });
                                model.questions = results;
                                if(results.length > 0) {
                                    model.results = true;
                                }
                                callback();
                            });
                        });
                },
                issues: function (callback) {
                    if(tab !== 'all' && tab !== 'issues') {
                        return callback();
                    }
                    db.Issue
                        .find({ createUserId: model.member._id })
                        .sort({ title: 1 })
                        .limit(tab === 'all' ? 15 : 0)
                        .lean()
                        .exec(function(err, results) {
                            flowUtils.setEditorsUsername(results, function() {
                                results.forEach(function (result) {
                                    flowUtils.appendEntryExtra(result);
                                });
                                model.issues = results;
                                if (results.length > 0) {
                                    if(results.length === 15) {
                                        model.issuesMore = true;
                                    }
                                    model.results = true;
                                }
                                callback();
                            });
                        });
                },
                opinions: function (callback) {
                    if(tab !== 'all' && tab !== 'opinions') {
                        return callback();
                    }
                    db.Opinion
                        .find({ createUserId: model.member._id })
                        .sort({ title: 1 })
                        .limit(tab === 'all' ? 15 : 0)
                        .lean()
                        .exec(function(err, results) {
                            flowUtils.setEditorsUsername(results, function() {
                                results.forEach(function (result) {
                                    flowUtils.appendEntryExtra(result);
                                });
                                model.opinions = results;
                                if (results.length > 0) {
                                    if(results.length === 15) {
                                        model.opinionsMore = true;
                                    }
                                    model.results = true;
                                }
                                callback();
                            });
                        });
                }
            }, function (err, results) {
                flowUtils.setModelContext(req, model);
                res.render(templates.members.profile.contributions, model);
            });
        });
    });

    /* Member Pages */

    router.get('/:username/pages', function (req, res) {
        var model = {};
        flowUtils.setModelContext(req, model);
        setMemberModel(model, req, function() {
            async.parallel({
                parent: function (callback) {
                    if (req.query.parent) {
                        db.Page.findOne({_id: req.query.parent}, function (err, result) {
                            model.page = result;
                            flowUtils.appendOwnerFlag(req, result, model);
                            callback();
                        });
                    } else {
                        callback();
                    }
                },
                pages: function (callback) {
                    var query = req.query.parent ? {
                        createUserId: model.member._id,
                        parentId: req.query.parent
                    } : {createUserId: model.member._id};
                    db.Page.find(query).sort({title: 1}).exec(function (err, results) {
                        if (req.query.parent) {
                            model.pages = results;
                        } else {
                            // Return pages with hierarchy
                            var nodes = [];
                            // Build parent pages
                            results.forEach(function (page) {
                                if (!page.parentId) {
                                    nodes.push(page);
                                }
                            });
                            results.forEach(function (page) {
                                if (page.parentId) {
                                    var parents = nodes.filter(function (p) {
                                        return p._id.equals(page.parentId);
                                    });
                                    var parent = parents.length > 0 ? parents[0] : null;
                                    if (parent) {
                                        if (!parent.children) {
                                            parent.children = [];
                                        }
                                        parent.children.push(page);
                                    } else {
                                        // parent not found, add as orphan
                                        nodes.push(page);
                                    }
                                } else {
                                    // no parent, if not existing, add as orphan
                                    var orphans = nodes.filter(function (p) {
                                        return p._id.equals(page._id);
                                    });
                                    var orphan = orphans.length > 0 ? orphans[0] : null;
                                    if (!orphan) {
                                        nodes.push(page);
                                    }
                                }
                            });
                            model.pageNodes = nodes;
                        }
                        callback();
                    });
                }
            }, function (err, results) {
                if(!req.query.parent) {
                    model.pagesRoot = true;
                }
                res.render(templates.members.profile.pages.index, model);
            });
        });
    });

    router.get('/:username/pages/create', function (req, res) {
        var model = {};
        flowUtils.setModelContext(req, model);
        setMemberModel(model, req, function() {
            if (req.user && req.user.id) {
                async.parallel({
                    parent: function (callback) {
                        if (req.query.parent) {
                            db.Page.findOne({_id: req.query.parent}, function (err, result) {
                                model.parent = result;
                                //flowUtils.appendOwnerFlag(req, result, model);
                                callback();
                            });
                        } else {
                            callback();
                        }
                    },
                    page: function (callback) {
                        if (req.query.id) {
                            db.Page.findOne({createUserId: req.user.id, _id: req.query.id}, function (err, result) {
                                model.page = result;
                                callback();
                            });
                        } else {
                            callback();
                        }
                    }
                }, function (err, results) {
                    res.render(templates.members.profile.pages.create, model);
                });
            } else {
                res.render(templates.members.profile.pages.create, model);
            }
        });
    });

    router.get('/:username/pages(/:friendlyUrl)?(/:friendlyUrl/:id)?', function (req, res) {
        var model = {};
        setMemberModel(model, req, function() {
            async.parallel({
                parent: function (callback) {
                    if (req.query.parent) {
                        db.Page.findOne({_id: req.query.parent}, function (err, result) {
                            model.parent = result;
                            callback();
                        });
                    } else {
                        callback();
                    }
                },
                page: function (callback) {
                    db.Page.findOne({_id: req.params.id}, function (err, result) {
                        model.page = result;
                        flowUtils.appendOwnerFlag(req, result, model);
                        callback();
                    });
                }
            }, function (err, results) {
                flowUtils.setModelContext(req, model);
                res.render(templates.members.profile.pages.page, model);
            });
        });
    });

    router.post('/:username/pages/create', function (req, res) {
        var query = {
            _id: req.query.id ? req.query.id : new mongoose.Types.ObjectId()
        };
        db.Page.findOne(query, function(err, result) {
            var entity = result ? result : {};
            entity.content = req.body.content;
            entity.title = req.body.title;
            entity.friendlyUrl = utils.urlify(req.body.title);
            entity.editUserId = req.user.id;
            entity.editDate = Date.now();
            if(!result) {
                entity.createUserId = req.user.id;
                entity.createDate = Date.now();
            }
            if(req.query.parent) {
                entity.parentId = req.query.parent;
            } else if(entity.parentId) {
                entity.parentId = null;
            }

            db.Page.findOneAndUpdate(query, entity, { upsert: true, new: true, setDefaultsOnInsert: true }, function(err, updatedEntity) {
                if (err) {
                    throw err;
                }
                var model = {};
                flowUtils.setModelContext(req, model);
                if(result) {
                    res.redirect(model.profileBaseUrl + paths.members.profile.pages.index + '/' + updatedEntity.friendlyUrl + '/' + updatedEntity._id + (req.query.parent ? '?parent=' + req.query.parent : ''));
                } else {
                    res.redirect(model.profileBaseUrl + paths.members.profile.pages.index);
                }
            });
        });
    });


    /* Diary Topics */

    router.get('/:username/diary', function (req, res) {
        var model = {};
        async.series({
            user: function(callback){
                setMemberModel(model, req, callback);
            },
            categories: function(callback) {
                db.Topic
                    .find({ parentId: null, ownerType: constants.OBJECT_TYPES.user, ownerId: model.member._id })
                    .sort({title: 1})
                    .lean()
                    .exec(function (err, results) {
                        async.each(results, function(result, callback) {
                            result.friendlyUrl = utils.urlify(result.title);
                            result.comments = utils.numberWithCommas(utils.randomInt(1, 100000));
                            db.Topic.find( { parentId: result._id } ).limit(3).sort({ title: 1 }).exec(function(err, subtopics) {
                                subtopics.forEach(function(subtopic){
                                    subtopic.friendlyUrl = utils.urlify(subtopic.title);
                                    subtopic.shortTitle = utils.getShortText(subtopic.contextTitle ? subtopic.contextTitle : subtopic.title, 38);
                                });
                                result.subtopics = subtopics;
                                callback();
                            });
                        }, function(err) {
                            model.categories = results;
                            callback();
                        });
                    });
            },
            topics: function(callback) {
                // display 15 if top topics, all if has topic parameter
                flowUtils.getTopics({ parentId: null, ownerType: constants.OBJECT_TYPES.user, ownerId: model.member._id }, 0, function (err, results) {
                    model.topics = results;
                    callback();
                });
            }
        }, function (err, results) {
            flowUtils.setModelContext(req, model);
            res.render(templates.members.profile.topics, model);
        });
    });

    router.get('/:username/diary/topics', function (req, res) {
        topicController.GET_index(req, res);
    });

    router.get('/:username/diary/topic(/:friendlyUrl)?(/:friendlyUrl/:id)?', function (req, res) {
        topicController.GET_entry(req, res);
    });

    router.get('/:username/diary/topics/create', function (req, res) {
        topicController.GET_create(req, res);
    });

    router.post('/:username/diary/topics/create', function (req, res) {
        topicController.POST_create(req, res);
    });


    /* Diary Arguments */

    router.get('/:username/diary/arguments', function (req, res) {
        argumentController.GET_index(req, res);
    });

    router.get('/:username/diary/argument(/:friendlyUrl)?(/:friendlyUrl/:id)?', function (req, res) {
        argumentController.GET_entry(req, res);
    });

    router.get('/:username/diary/arguments/create', function (req, res) {
        argumentController.GET_create(req, res);
    });

    router.post('/:username/diary/arguments/create', function (req, res) {
        argumentController.POST_create(req, res);
    });

    router.get('/:username/diary/arguments/link', function (req, res) {
        argumentController.GET_link(req, res);
    });

    router.post('/:username/diary/arguments/link', function (req, res) {
        argumentController.POST_link(req, res);
    });


    /* Diary Questions */

    router.get('/:username/diary/questions', function (req, res) {
        questionController.GET_index(req, res);
    });

    router.get('/:username/diary/question(/:friendlyUrl)?(/:friendlyUrl/:id)?', function (req, res) {
        questionController.GET_entry(req, res);
    });

    router.get('/:username/diary/questions/create', function (req, res) {
        questionController.GET_create(req, res);
    });

    router.post('/:username/diary/questions/create', function (req, res) {
        questionController.POST_create(req, res);
    });


    /* Diary Issues */

    router.get('/:username/diary/issues', function (req, res) {
        issueController.GET_index(req, res);
    });

    router.get('/:username/diary/issue(/:friendlyUrl)?(/:friendlyUrl/:id)?', function (req, res) {
        issueController.GET_entry(req, res);
    });

    router.get('/:username/diary/issues/create', function (req, res) {
        issueController.GET_create(req, res);
    });

    router.post('/:username/diary/issues/create', function (req, res) {
        issueController.POST_create(req, res);
    });


    /* Diary Opinions */

    router.get('/:username/diary/opinions', function (req, res) {
        opinionController.GET_index(req, res);
    });

    router.get('/:username/diary/opinion(/:friendlyUrl)?(/:friendlyUrl/:id)?', function (req, res) {
        opinionController.GET_entry(req, res);
    });

    router.get('/:username/diary/opinions/create', function (req, res) {
        opinionController.GET_create(req, res);
    });

    router.post('/:username/diary/opinions/create', function (req, res) {
        opinionController.POST_create(req, res);
    });
};