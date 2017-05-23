var Botkit = require(__dirname + '/CoreBot.js');
var request = require('request');
var express = require('express');
var crypto = require('crypto');

function RocketChat(configuration) {
    var webhook_url = configuration.webhook_url;
    // Create a core botkit bot
    var rocketchat_botkit = Botkit(configuration || {});

    rocketchat_botkit.defineBot(function(botkit, config) {

        var bot = {
            type: 'rc',
            botkit: botkit,
            config: config || {},
            utterances: botkit.utterances,
        };

        bot.startConversation = function (message, cb) {
            botkit.startConversation(this, message, cb);
        };

        bot.createConversation = function (message, cb) {
            botkit.createConversation(this, message, cb);
        };

        bot.send = function (message, cb) {
            request({
                    method: 'POST',
                    json: true,
                    headers: {
                        'content-type': 'application/json',
                    },
                    body: message,
                    uri: webhook_url
                },
                function (err, res, body) {


                    if (err) {
                        botkit.debug('WEBHOOK ERROR', err);
                        return cb && cb(err);
                    }

                    if (body.error) {
                        botkit.debug('API ERROR', body.error);
                        return cb && cb(body.error.message);
                    }

                    botkit.debug('WEBHOOK SUCCESS', body);
                    cb && cb(null, body);
                });

        };

        bot.reply = function (src, resp, cb) {
            var msg = {};

            if (typeof(resp) == 'string') {
                msg.text = resp;
            } else {
                msg = resp;
            }

            msg.channel = src.channel;

            bot.say(msg, cb);
        };

        bot.startTyping = function(src, cb) {
            if(cb){cb();}
        };

        bot.stopTyping = function(src, cb) {
            if(cb){cb();}
        };

        bot.replyWithTyping = function(src, resp, cb) {
            bot.reply(src, resp, cb);

        };

        bot.findConversation = function (message, cb) {
            botkit.debug('CUSTOM FIND CONVO', message.user, message.channel);
            for (var t = 0; t < botkit.tasks.length; t++) {
                for (var c = 0; c < botkit.tasks[t].convos.length; c++) {
                    if (
                        botkit.tasks[t].convos[c].isActive() &&
                        botkit.tasks[t].convos[c].source_message.user == message.user
                    ) {
                        botkit.debug('FOUND EXISTING CONVO!');
                        cb(botkit.tasks[t].convos[c]);
                        return;
                    }
                }
            }

            cb();
        };

        return bot;
    });

    // set up a web route for receiving outgoing webhooks and/or slash commands
    rocketchat_botkit.createWebhookEndpoints = function(webserver, bot, cb) {

        rocketchat_botkit.log(
            '** Serving webhook endpoints for Messenger Platform at: ' +
            'http://' + rocketchat_botkit.config.hostname + ':' + rocketchat_botkit.config.port + '/rocketchat/receive');
        webserver.post('/rocketchat/receive', function(req, res) {
            res.send('ok');
            rocketchat_botkit.handleWebhookPayload(req, res, bot);
        });

        if (cb) {
            cb();
        }

        return rocketchat_botkit;
    };

    rocketchat_botkit.handleWebhookPayload = function(req, res, bot) {

        var obj = req.body;
        console.log(req);
        if (obj) {
            var message = {
                text: obj.text,
                user: obj.user_id,
                channel: obj.channel_id,
                timestamp: obj.timestamp,
                token: obj.token,
                user_name: obj.user_name,
                type: 'text',
            };
            rocketchat_botkit.receiveMessage(bot, message);
        }
    };

    return rocketchat_botkit;
};

module.exports = RocketChat;