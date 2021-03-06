'use strict';

var templates   = require('../models/templates'),
    config      = require('../config/config'),
    flowUtils   = require('../utils/flowUtils'),
    db          = require('../app').db.models,
    fs          = require('fs'),
    async       = require('async');

var cols = config.mongodb.collections;

function requestLogin(req, res) {
    // redirect to login
    res.set('X-Auth-Required', 'true');
    req.session.returnUrl = req.originalUrl;
    res.redirect('/login/');
}

module.exports = function (router) {

    router.get('/', function (req, res) {
        var model = {};
        model.dirname = flowUtils.getBackupDir();

        // Validate if db is already up. If yes, check if user is logged in and is admin
        if (req.isAuthenticated()) {
            if (req.user.canPlayRoleOf('admin')) {
                model.showRestore = true;
            }
            // else: User won't be allowed.
            res.render(templates.install, model);
        } else {
            db.Admin.findOne({}, function(err, result) {
                if(!result) {
                    // No data, allow the user to restore.
                    model.showRestore = true;
                    res.render(templates.install, model);
                } else {
                    requestLogin(req, res);
                }
            });
        }
    });

    router.post('/', function (req, res) {
        var model = {};

        var next = function () {
            model.dirname = flowUtils.getBackupDir();
            var dir = flowUtils.getBackupDir() + '/wikitruth';
            //console.log(cols.backupList);

            async.eachSeries(cols.backupList, function (col, callback) {
                var coldir = dir + '/' + col;
                var jsons = fs.readdirSync(coldir);
                //console.log('restore:', col);
                //console.log(jsons);
                if (cols.modelMapping[col]) {
                    var collection = db[cols.modelMapping[col]];
                    if (collection) {
                        collection.remove({}, function (err) {
                            async.eachSeries(jsons, function (json, callback) {
                                var file = coldir + '/' + json;
                                var obj = JSON.parse(fs.readFileSync(file, 'utf8'));
                                collection.create(obj, function (err, newObj) {
                                    if (err) {
                                        console.error(err);
                                    }
                                    callback();
                                });
                            }, function (err) {
                                callback();
                            });
                        });
                    } else {
                        callback();
                    }
                } else {
                    callback();
                }
            }, function (err) {
                model.done = true;
                res.render(templates.install, model);
            });
        };

        if (req.isAuthenticated()) {
            if (req.user.canPlayRoleOf('admin')) {
                model.showRestore = true;
                next();
            } else {
                // User won't be allowed.
                return res.redirect('/');
            }
        } else {
            db.Admin.findOne({}, function (err, result) {
                if (!result) {
                    // No data, allow the user to restore.
                    model.showRestore = true;
                    next();
                } else {
                    requestLogin(req, res);
                }
            });
        }
    });
};
