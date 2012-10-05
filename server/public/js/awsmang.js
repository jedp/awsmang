_.templateSettings = {
  interpolate: /\{\{(.+?)\}\}/g
};


var Server = Backbone.Model.extend({
  defaults: {
    address: "---",
    statusCode: "---",
    date: "0",
    time: "---"
  }
});

var Dashboard = Backbone.Model.extend({});

var ServerView = Backbone.View.extend({
  model: Server,

  tagName: 'div',

  template: _.template($('#server-view-template').html()),

  className: 'serverView',

  initialize: function() {
    this._statuses = {};

    _.bindAll(this, 'update', 'render');
    return this;
  },

  update: function(status) {
    this.model.set(status.data);
    this.render();
  },

  render: function() {
    $(this.el).html(this.template(this.model.toJSON()));
    return this;
  },
});

/*
 * A DashboardView shows the dashboard as a collection of ServerViews
 */
var DashboardView = Backbone.View.extend({
  model: Dashboard,

  el: $('#servers'),

  initialize: function() {
    var self = this;
    this._serverViews = {};
    this.socket = io.connect();

    this.socket.on('connect', function() {
      // yay
    });
    this.socket.on('update', function(message) {
      self.updateServer(message);
    });
    this.socket.on('addServer', function(message) {
      self.addServer(message);
    });
    this.socket.on('removeServer', function(message) {
      self.removeServer(message);
    });

    _.bindAll(this, 'render');
    return this;
  },

  addServer: function(data) {
    console.log("add server: " + data.address);
    if (! this._serverViews[data.address]) {
      var server = new Server({address: data.address});
      var serverView = new ServerView({model: server});
      this._serverViews[data.address] = serverView;
      $(this.el).append(serverView.render().el);
    }
    return this;
  },

  removeServer: function(data) {
    console.log("remove " + data.address);
    this._serverViews[data.address].remove();
    delete this._serverViews[data.address];
  },

  updateServer: function(data) {
    var address = data.address;
    if (address) {
      if (!this._serverViews[address]) {
        this.addServer(data);
      } else {
        this._serverViews[address].update(data);
      }
    }
  },

  render: function() {
    return this;
  }
});