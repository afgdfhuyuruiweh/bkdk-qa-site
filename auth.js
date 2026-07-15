class AuthService {
    constructor() {
        this.currentUser = null;
        this.listeners = [];
        this.init();
    }

    init() {
        const savedSession = localStorage.getItem("bkdk_owner_logged_in");
        if (savedSession === "true") {
            this.currentUser = window.db.getOwner();
        }
    }

    onAuthStateChanged(callback) {
        this.listeners.push(callback);
        callback(this.currentUser);
        return () => {
            this.listeners = this.listeners.filter(cb => cb !== callback);
        };
    }

    notify() {
        this.listeners.forEach(cb => cb(this.currentUser));
    }

    loginWithOwnerGoogle() {
        if (window.FIREBASE_ACTIVE && window.firebaseLogin) {
            window.firebaseLogin();
            return;
        }
        const owner = window.db.getOwner();
        this.currentUser = owner;
        localStorage.setItem("bkdk_owner_logged_in", "true");
        this.notify();
        return owner;
    }

    async loginWithPassword(emailOrUsername, password) {
        if (window.FIREBASE_ACTIVE && window.firebaseLoginWithPassword) {
            return await window.firebaseLoginWithPassword(emailOrUsername, password);
        }
        const owner = window.db.getOwner();
        const emailMatch = owner.adminEmail && emailOrUsername.toLowerCase() === owner.adminEmail.toLowerCase();
        const handleMatch = owner.handle && emailOrUsername.toLowerCase() === owner.handle.toLowerCase();
        const passwordMatch = owner.adminPassword && password === owner.adminPassword;
        
        if ((emailMatch || handleMatch) && passwordMatch) {
            this.currentUser = owner;
            localStorage.setItem("bkdk_owner_logged_in", "true");
            this.notify();
            return owner;
        }
        throw new Error("Invalid username/email or password.");
    }

    logout() {
        if (window.FIREBASE_ACTIVE && window.firebaseLogout) {
            window.firebaseLogout();
            return;
        }
        this.currentUser = null;
        localStorage.setItem("bkdk_owner_logged_in", "false");
        this.notify();
    }

    updateOwnerProfile(updatedData) {
        const updated = window.db.saveOwner(updatedData);
        this.currentUser = updated;
        this.notify();
        return updated;
    }
}

window.auth = new AuthService();
