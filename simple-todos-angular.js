Tasks = new Mongo.Collection('tasks');

// This code only runs on the client
if (Meteor.isClient) {

  // Set the accounts plugin to use username instead of email
  Accounts.ui.config({
    passwordSignupFields: "USERNAME_ONLY"
  });

  // Makes an app called simple-todos that requires angular-meteor
  angular.module('simple-todos', ['angular-meteor']);

  // Add a controller called TodosListCtrl that requires $scope and $meteor
  angular.module('simple-todos').controller('TodosListCtrl', ['$scope', '$meteor',
    function($scope, $meteor) {

      // Subscribe to the tasks collection
      $scope.$meteorSubscribe('tasks');

      // Get the tasks from the meteor collection
      $scope.tasks = $meteor.collection(function() {
        // getReactively makes the ux bind to data changes
        // Not sure where 'query' comes from, maybe the watcher below
        return Tasks.find($scope.getReactively('query'), {
          sort: {
            createdAt: -1
          }
        })
      });

      $scope.addTask = function(newTask) {
        $meteor.call('addTask', newTask);
      };

      $scope.deleteTask = function(task) {
        $meteor.call('deleteTask', task._id);
      };

      $scope.setChecked = function(task) {
        $meteor.call('setChecked', task._id, !task.checked);
      };

      $scope.setPrivate = function(task) {
        $meteor.call('setPrivate', task._id, !task.private);
      };

      // When the hideCompleted variable changes alter the tasks query
      $scope.$watch('hideCompleted', function() {
        if ($scope.hideCompleted)
          $scope.query = {
            checked: {
              $ne: true
            }
          };
        else
          $scope.query = {};
      });

      $scope.incompleteCount = function() {
        return Tasks.find({
          checked: {
            $ne: true
          }
        }).count();
      };

    }
  ]);
}

// This code only runs on the server
if (Meteor.isServer) {
  // Publish the tasks collection
  Meteor.publish('tasks', function() {
    return Tasks.find({
      // Get the tasks that are
      $or: [{
        private: {
          // Not private
          $ne: true
        }
      }, {
        // Owned by this user
        owner: this.userId
      }]
    });
  });
}

// Methods available on client and server
Meteor.methods({
  addTask: function(text) {
    // Make sure the user is logged in before inserting a task
    if (!Meteor.userId()) {
      throw new Meteor.Error('not-authorized');
    }

    Tasks.insert({
      text: text,
      createdAt: new Date(),
      owner: Meteor.userId(),
      username: Meteor.user().username
    });
  },
  deleteTask: function(taskId) {
    // Note: I think the actual removal is done in the ng.html file
    var task = Tasks.findOne(taskId);
    if (task.private && task.owner !== Meteor.userId()) {
      // If the task is private, make sure only the owner can delete it
      throw new Meteor.Error('not-authorized');
    }

    Tasks.remove(taskId);
  },
  setChecked: function(taskId, setChecked) {
    Tasks.update(taskId, {
      $set: {
        checked: setChecked
      }
    });
  },
  setPrivate: function(taskId, setToPrivate) {
    var task = Tasks.findOne(taskId);
    if (task.private && task.owner !== Meteor.userId()) {
      // If the task is private, make sure only the owner can check it off
      throw new Meteor.Error('not-authorized');
    }

    Tasks.update(taskId, {
      $set: {
        private: setToPrivate
      }
    });
  }
});