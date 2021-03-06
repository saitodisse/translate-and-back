var HumanModel = require('human-model');
var TransResult = require('./transResult');
var RSVP = require('rsvp');
var async = require('async');
RSVP.on('error', function (reason) {
    console.assert(false, reason);
});


module.exports = HumanModel.define({
    props: {
        transPackage: 'object',
        transResultArray: 'array',
        results: ['array', false, []],
        translationResultCallback: ['function', false, function () {}],
        translationAllResultsCallback: ['function', false, , false, function () {}]
    },

    prepareResults: function () {
        this.transResultArray = [];
        var promise = new RSVP.Promise(function (resolve, reject) {

            // TransPackage Validation
            var transPackage = this.transPackage;
            try {
                transPackage.validate();
            } catch (err) {
                reject(err);
            }

            //get all languages
            var langs = transPackage.langPath.split(',');
            for (var i = 0; i < langs.length - 1; i++) {
                var lang1 = langs[i];
                var lang2 = langs[i + 1];

                var transResult = new TransResult();
                transResult.fromLang = lang1;
                transResult.toLang = lang2;

                if (i === 0) {
                    transResult.fromSentence = transPackage.sentence;
                }

                this.transResultArray.push(transResult);
            }

            resolve(this.transResultArray);
        }.bind(this));
        return promise;
    },

    translateAll: function (translatorController) {
        var promise = new RSVP.Promise(function (resolve, reject) {

            var transResult;
            async.whilst(
                function () {
                    transResult = this.transResultArray.shift();
                    return transResult;
                }.bind(this),
                function (callback) {
                    this.translateNext(translatorController, transResult)
                    .then(function (/* result */) {
                        callback();
                    });
                }.bind(this),
                function (err) {
                    if (err) {
                        reject(err);
                    }
                    else {
                        resolve(this.results);
                    }
                }.bind(this)
            );
        
        }.bind(this));

        return promise;
    },

    translateNext: function (translatorController, transResult) {
        var promise = new RSVP.Promise(function (resolve, reject) {
            // // sets "from" equals "to" from previous
            if (transResult.fromSentence === '' && this.results.length > 0) {
                transResult.fromSentence = this.results[this.results.length - 1].toSentence;
            }

            // First Translation
            translatorController.callTranslate(
                transResult.fromSentence,
                transResult.fromLang,
                transResult.toLang
            )
            .then(function (firstResult) {
                transResult.toSentence = firstResult;

                // Second Translation
                return translatorController.callTranslate(
                            transResult.toSentence,
                            transResult.toLang,
                            transResult.sideLang);
            }.bind(this))
            .then(function (sideResult) {
                transResult.sideSentence = sideResult;
                this.results.push(transResult);
                this.translationResultCallback(transResult);
                resolve(transResult);
            }.bind(this))
            .catch(function (reason) {
                reject(reason);
            });
        }.bind(this));
        return promise;
    }

});
