_.templateSettings = {
  interpolate: /\{\{(.+?)\}\}/g
};

var History = Backbone.Model.extend({});
var Server = Backbone.Model.extend({});
var Dashboard = Backbone.Model.extend({
  defaults: {
    serverViews: {}
  }
});

var HistoryView = Backbone.View.extend({
});

var ServerView = Backbone.View.extend({
  model: Server,

  tagName: 'div',

  template: _.template($('#server-view-template').html()),

  className: 'serverView',

  initialize: function() {
    return this;
  },

  render: function() {
    $(this.el).html(this.template(this.model.toJSON()));
  },
});

/*
 * A DashboardView shows the dashboard as a collection of ServerViews
 */
var DashboardView = Backbone.View.extend({
  model: Dashboard,

  el: $('#dashboard'),

  addServer: function(name) {
    if (! this.model.serverViews[name]) {
      console.log("add server: " + name);
      var server = new Server(name);
      this.model.serverViews[name] = new ServerView({model: server});
    }
  },

  initialize: function() {
    this.socket = io.connect();

    this.socket.on('connect', function() {
      // yay
    });
    this.socket.on('update', function(message) {
      console.log(message);
      // status data from a server
    });
    this.socket.on('addServer', function(message) {
      // add a server to the list
    });
    this.socket.on('removeServer', function(message) {
      // remove a server from the list
    });

    _.bindAll(this, 'render');
    return this;
  },

  render: function() {
    return this;
  }
});