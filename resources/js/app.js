window.onload = function () {


  var isValidEmail = function(email) {
    var re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(String(email).toLowerCase());
  };


  var fires = {
    newCompany: function(newCompany) {
      return db.collection(COLLECTION).add({
        company: newCompany,
        entry: '@INSANE@',
      });
    },

    deleteCompany: function(company) {
      var people = db.collection(COLLECTION).where('company', '==', company);
      people.get().then((querySnapshot) => {
        querySnapshot.forEach(doc => {
          doc.ref.delete();
        });
      });
    },

    registerEntry: function(name, company) {
      return db.collection(COLLECTION).add({
        company: company,
        entry: name,
      });
    },

    getAllEntries: function() {
      var entries = db.collection(COLLECTION);
      var allCollected = {};

      return entries.get().then((querySnapshot) => {
        querySnapshot.forEach(doc => {
          var data = doc.data();

          var local = allCollected[data.company];
          if (!local) local = allCollected[data.company] = [];

          local.push(data);
        });

        console.log(allCollected);
        return allCollected;
      });
    },

    signInAnon: function() {
      // Try signing the user in as anonymously
      return firebase.auth().signInAnonymously().catch(function(error) {
        var errorCode = error.code;
        var errorMessage = error.message;

        alert("Logging in failed with: " + errorCode + " " + errorMessage);
      });
    },

    signInEmail: function(email, password) {
      return firebase.auth().signInWithEmailAndPassword(email, password);
    },

    logOut: function(email, password) {
      return firebase.auth().currentUser.delete();
    }
  };


  var appState = Ractive({
    el: 'container',
    template: '#template',
    data: {
      user: {
        loggedIn: false,
        loginFailed: false,
      },

      admin: {
        modal: false,
        email: null,
        password: null,
        loggedIn: false,
        
        validations: {
          email: true,
          password: true,
        },

        newCompany: null,
      },

      registrations: [],
    },

    anchorStr: function(str) {
      return str.replace(/ /g, '-');
    },

    // Should have at least one flagging entry
    transformStoreToState: function(dataStore) {
      var transformed = {};

      for(var key of Object.keys(dataStore)) {
        var value = dataStore[key];

        var sane = value.filter(el => el.entry != '@INSANE@')
        if ((value.length - sane.length) === 0) continue;

        var entries = sane.map(el => {
          return { name: el.entry };
        });

        entries.sort((entry, entry2) => {
          return entry2.name < entry.name;
        });

        transformed[key] = entries;
      }

      return transformed;
    },

    pushStoreToState: function() {
      this.set('registrations', []);

      fires.getAllEntries().then(dataStore => {
        var transformed = this.transformStoreToState(dataStore);
        for(var key of Object.keys(transformed))
          this.pushCompany(key, transformed[key]);
      });
    },

    registerSelf: function(context) {
      var nameSelf = context.get('nameSelf');
      if (!nameSelf) return;

      // Send it to firebase
      var company = context.get('company');
      fires.registerEntry(nameSelf, company);

      context.push('entries', { name: nameSelf });
      context.set('nameSelf', null);
      context.set('registering', false);
    },

    reloadWithAdmin: function() {
      this.set('registrations', []);

      return fires.logOut().then(() => {
        window.location.hash = "#/admin";
        location.reload();
      });
    },

    loginAdmin: function() {
      var email = this.get('admin.email');
      var password = this.get('admin.password');

      if (!email || !isValidEmail(email)) {
        this.set('admin.validations.email', false);
        return;
      }

      // Save half a render cycle.
      this.set('admin.validations.email', true);
      this.set('admin.validations.password', true);

      if (!password) {
        this.set('admin.validations.password', false);
        return;
      }

      fires.signInEmail(email, password).then(user => {
        this.set('user.loggedIn', false);
        this.set('admin.loggedIn', true);
        this.set('admin.modal', false);
      }, error => {
        this.set('admin.loggedIn', false);
        this.set('admin.validations.email', false);
        this.set('admin.validations.password', false);
      });
    },

    adminCancelLogin: function() {
      var promise = new Promise((res) => res());

      if (!this.get('admin.loggedIn'))
        promise = fires.signInAnon();

      return promise.then(() => {
        this.set('admin.modal', false);
      });
    },

    pushCompany: function(name, entries) {
      // Add to top of list to keep better order
      this.splice('registrations', 0, 0, {
        registering: false,
        company: name,
        entries: entries,
      });
    },

    addCompany: function() {
      if (!this.get('admin.loggedIn')) return;

      var newCompany = this.get('admin.newCompany');
      if (!newCompany) return;

      // Register Company
      fires.newCompany(newCompany);

      // Push a new company to stack
      this.pushCompany(newCompany, []);

      // Reset newCompany
      this.set('admin.newCompany', null);
    },

    deleteCompany: function(keypath) {
      if (!this.get('admin.loggedIn')) return;

      // Ask Firebase to delete it too.
      var company = this.get(keypath);
      fires.deleteCompany(company.company);

      // Update internal view
      this.remove(keypath);
    },

    export: function(keypath) {
      var company = this.get(keypath);
      var rows = [['S.No', 'Name']];

      company.entries.forEach((el, index) => {
        rows.push([index+1, el.name]);
      });

      csv.export(rows, company.company);
    }
  });


  firebase.auth().onAuthStateChanged(function(user) {
    var val = user && (user.isAnonymous || user.email);
    appState.set('user.loggedIn', val);
    appState.set('user.loginFailed', !val);
    if (!val) return;

    appState.pushStoreToState();
  });

  firebase.auth().setPersistence(firebase.auth.Auth.Persistence.NONE)
  .then(() => {
    (new Navigo(null, false, '#/'))
    .on('admin', function() {
      appState.set('admin.modal', true);
    })
    .notFound(() => {
      fires.signInAnon();
    })
    .resolve();
  });

};
