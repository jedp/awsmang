/*
 * Logger from socket.io-node
 * Original code Copyright(c) 2011 LearnBoost <dev@learnboost.com> (MIT Licensed)
 */

function toArray(enumerable) {
  var array = [];

  for (var i = 0, l = enumerable.length; i < l; i++)
    array.push(enumerable[i]);

  return array;
};

const levels = ['error', 'warn', 'info', 'debug'];
const colors = [31, 33, 36, 90];
const maxLabelLength = 5;

function pad(label) {
  if (label.length < maxLabelLength) {
    return label + new Array(maxLabelLength - label.length + 1).join(' ');
  }
  return label;
};

/**
 * Logger (console).
 *
 * @api public
 */

var Logger = module.exports = function(options) {
  options = options || {};
  this.colors = false !== options.colors;
  this.level = 3;
  this.enabled = true;
};

/**
 * Log method.
 *
 * @api public
 */

Logger.prototype.log = function (type) {
  var index = levels.indexOf(type);

  if (index > this.level || !this.enabled) {
    return this;
  }

  console.log.apply(console,
    [this.colors
     ? '   \033[' + colors[index] + 'm' + pad(type) + ' -\033[39m'
     : type + ':'
    ].concat(toArray(arguments).slice(1))
  );

  return this;
};

/**
 * Generate methods.
 */

levels.forEach(function (name) {
  Logger.prototype[name] = function () {
    this.log.apply(this, [name].concat(toArray(arguments)));
  };
});
