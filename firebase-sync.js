// BkDk Q&A Space Firebase Synchronization Module (Real-Time Connector)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, collection, addDoc, query, where, getDocs, updateDoc, deleteDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Check if a valid Firebase configuration is provided
if (window.FIREBASE_CONFIG && window.FIREBASE_CONFIG.apiKey) {
    console.log("BkDk Q&A: Live Firebase configuration found. Initializing public real-time database...");

    const app = initializeApp(window.FIREBASE_CONFIG);
    const auth = getAuth(app);
    const db = getFirestore(app);

    window.FIREBASE_ACTIVE = true;

    // --- REAL-TIME DATA SYNC ---
    
    // 1. Sync Owner Document
    const ownerDocRef = doc(db, "owners", "bkdk");
    
    // Ensure owner document exists in database
    getDoc(ownerDocRef).then((snap) => {
        if (!snap.exists()) {
            const initialOwner = JSON.parse(localStorage.getItem("bkdk_owner")) || {
                id: "owner_bkdk",
                handle: "wonderduo",
                displayName: "wonder duo 💥⚡",
                avatar: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><defs><linearGradient id='bkdk-grad' x1='0%' y1='0%' x2='100%' y2='100%'><stop offset='0%' stop-color='%2300ffcc'/><stop offset='100%' stop-color='%23ff5e00'/></linearGradient></defs><circle cx='50' cy='50' r='50' fill='url(%23bkdk-grad)'/><text x='50' y='65' font-size='42' text-anchor='middle'>💥</text></svg>",
                header: "default",
                landingBio: "⊹₊˚‧︵‿₊୨ᰔ WONDERDUO Q&A ᰔ ୧₊‿︵‧˚₊⊹\n╰┈➤ BakuDeku Q&A and writing corner.\n\n.ᐟ Welcome! I’m Rue (or Rory!)—part-time AU writer, full-time BakuDeku enthusiast, and professional shipper of the Wonder Duo. 💥⚡ I spend 90% of my time thinking about their rival-to-lovers arc and 10% actually writing fics.\n\n⤹⤷ System Log: This page is my digital fallout shelter for all things bkdk. Feed my inbox with prompts, headcanons, questions, or just share your favorite scenes! Let's talk about our favorite boys. 🧡💚",
                bio: "💥 Welcome to our explosive corner of the internet! Just another space for bkdk fanfics, headcanons, and the wonder duo itself. Feed our inbox with prompts, questions, ship discussions, or just say hi! ⚡\n\n.ᐟ Comfort zones: multishipping-friendly, au-maker, but bkdk is our absolute main. Ask us anything!",
                sidebarBio: "wonder duo • she/they\nwriting fics & au threads\nbkdk is my hyperfixation\nask me anything!",
                website: "x.com",
                askPrompt: "Type your question here...",
                askPlaceholder: "Type your question here...",
                askTitle: "Ask us anything! 💥⚡",
                theme: "wonder-duo",
                allowAnonymous: true,
                followers: 124,
                following: 58,
                twitter: "wonderduo",
                twitter2: "",
                tiktok: "wonderduo",
                tiktok2: "",
                discord: "",
                discord2: "",
                discordServer: "",
                ao3: "",
                adminEmail: "",
                adminPassword: ""
            };
            setDoc(ownerDocRef, initialOwner);
        }
    });

    onSnapshot(ownerDocRef, (snap) => {
        if (snap.exists()) {
            const data = snap.data();
            let needsUpdate = false;
            if (data.adminEmail === undefined) {
                data.adminEmail = "";
                needsUpdate = true;
            }
            if (data.adminPassword === undefined) {
                data.adminPassword = "";
                needsUpdate = true;
            }
            if (needsUpdate) {
                setDoc(ownerDocRef, { 
                    adminEmail: data.adminEmail || "",
                    adminPassword: data.adminPassword || "" 
                }, { merge: true });
            }
            
            localStorage.setItem("bkdk_owner", JSON.stringify(data));
            // Notify auth and app elements to re-render
            if (window.auth && window.auth.notify) {
                // If logged in locally, update auth currentUser reference
                if (localStorage.getItem("bkdk_owner_logged_in") === "true") {
                    window.auth.currentUser = data;
                }
                window.auth.notify();
            }
            window.dispatchEvent(new Event("bkdk_db_sync"));
        }
    });

    // 2. Sync Questions Collection
    const questionsCol = collection(db, "bkdk_questions");
    
    // Seed database if questions collection is empty
    getDocs(questionsCol).then((snap) => {
        if (snap.empty) {
            const initialQs = JSON.parse(localStorage.getItem("bkdk_questions")) || [];
            initialQs.forEach(q => {
                addDoc(questionsCol, {
                    senderName: q.senderName,
                    text: q.text,
                    createdAt: q.createdAt,
                    answeredAt: q.answeredAt,
                    answer: q.answer,
                    likes: q.likes || [],
                    comments: q.comments || [],
                    isAnonymous: q.isAnonymous || false
                });
            });
        }
    });

    let isInitialLoad = true;
    onSnapshot(questionsCol, (snapshot) => {
        const list = [];
        snapshot.forEach((doc) => {
            list.push({ id: doc.id, ...doc.data() });
        });
        
        localStorage.setItem("bkdk_questions", JSON.stringify(list));
        
        // Handle desktop notifications for new incoming questions
        if (!isInitialLoad) {
            snapshot.docChanges().forEach((change) => {
                if (change.type === "added") {
                    const q = change.doc.data();
                    if (q.answer === null && localStorage.getItem("bkdk_owner_logged_in") === "true") {
                        if (window.showDesktopNotification) {
                            window.showDesktopNotification({ id: change.doc.id, ...q });
                        }
                    }
                }
            });
        }
        isInitialLoad = false;
        
        if (window.auth && window.auth.notify) {
            window.auth.notify();
        }
        window.dispatchEvent(new Event("bkdk_db_sync"));
    });

    // --- WRITE ACTIONS (EXPOSED OVERRIDES) ---

    window.firebaseAskQuestion = async (text, senderName, isAnonymous, parentQuestionId = null) => {
        try {
            await addDoc(questionsCol, {
                senderName: isAnonymous ? "Anonymous" : (senderName ? senderName.trim() : "Friend"),
                text: text,
                createdAt: new Date().toISOString(),
                answeredAt: null,
                answer: null,
                likes: [],
                comments: [],
                parentQuestionId: parentQuestionId,
                isAnonymous: !!isAnonymous
            });
        } catch (e) {
            console.error("Firebase askQuestion error", e);
        }
    };

    window.firebaseCreatePost = async (text, parentQuestionId = null) => {
        try {
            await addDoc(questionsCol, {
                senderName: null,
                text: "",
                isPost: true,
                createdAt: new Date().toISOString(),
                answeredAt: new Date().toISOString(),
                answer: text,
                likes: [],
                comments: [],
                parentQuestionId: parentQuestionId
            });
        } catch (e) {
            console.error("Firebase createPost error", e);
        }
    };

    window.firebaseAddComment = async (itemId, text, senderName) => {
        try {
            const docRef = doc(db, "bkdk_questions", itemId);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                const data = docSnap.data();
                const comments = data.comments || [];
                comments.push({
                    id: "c_" + Date.now() + "_" + Math.random().toString(36).substr(2, 5),
                    senderName: senderName ? senderName.trim() : "Anonymous",
                    text: text,
                    createdAt: new Date().toISOString()
                });
                await updateDoc(docRef, { comments: comments });
            }
        } catch (e) {
            console.error("Firebase addComment error", e);
        }
    };

    window.firebaseAnswerQuestion = async (questionId, answerText) => {
        try {
            const docRef = doc(db, "bkdk_questions", questionId);
            await updateDoc(docRef, {
                answer: answerText,
                answeredAt: new Date().toISOString()
            });
        } catch (e) {
            console.error("Firebase answerQuestion error", e);
        }
    };

    window.firebaseUpdateSenderName = async (questionId, newName) => {
        try {
            const docRef = doc(db, "bkdk_questions", questionId);
            await updateDoc(docRef, {
                senderName: newName ? newName.trim() : "Anonymous"
            });
        } catch (e) {
            console.error("Firebase updateSenderName error", e);
        }
    };

    window.firebaseDeleteQuestion = async (questionId) => {
        try {
            const docRef = doc(db, "bkdk_questions", questionId);
            await deleteDoc(docRef);
        } catch (e) {
            console.error("Firebase deleteQuestion error", e);
        }
    };

    window.firebaseUpdateQuestion = async (questionId, fields) => {
        try {
            const docRef = doc(db, "bkdk_questions", questionId);
            await updateDoc(docRef, fields);
        } catch (e) {
            console.error("Firebase updateQuestion error", e);
        }
    };

    window.firebaseLikeAnswer = async (questionId, visitorSessionId) => {
        try {
            const docRef = doc(db, "bkdk_questions", questionId);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                const data = docSnap.data();
                const likes = data.likes || [];
                const idx = likes.indexOf(visitorSessionId);
                if (idx === -1) {
                    likes.push(visitorSessionId);
                } else {
                    likes.splice(idx, 1);
                }
                await updateDoc(docRef, { likes: likes });
            }
        } catch (e) {
            console.error("Firebase likeAnswer error", e);
        }
    };

    window.firebaseSaveOwner = async (ownerData) => {
        try {
            await setDoc(ownerDocRef, ownerData, { merge: true });
        } catch (e) {
            console.error("Firebase saveOwner error", e);
        }
    };

    // --- GOOGLE AUTHENTICATION INTEGRATION ---

    const provider = new GoogleAuthProvider();

    window.firebaseLogin = async () => {
        try {
            const result = await signInWithPopup(auth, provider);
            const user = result.user;
            
            const docSnap = await getDoc(ownerDocRef);
            let adminEmail = "";
            if (docSnap.exists()) {
                const data = docSnap.data();
                adminEmail = data.adminEmail || "";
                
                if (!adminEmail) {
                    adminEmail = user.email;
                    await setDoc(ownerDocRef, { adminEmail: user.email }, { merge: true });
                    console.log(`BkDk Q&A: ${user.email} claimed sole ownership of this Q&A space!`);
                }
            } else {
                adminEmail = user.email;
                await setDoc(ownerDocRef, {
                    id: "owner_bkdk",
                    handle: "wonderduo",
                    displayName: "wonder duo 💥⚡",
                    theme: "wonder-duo",
                    allowAnonymous: true,
                    adminEmail: user.email
                }, { merge: true });
            }
            
            if (user.email !== adminEmail) {
                await signOut(auth);
                localStorage.setItem("bkdk_owner_logged_in", "false");
                alert(`Access Denied: ${user.email} is not authorized to manage this dashboard.`);
                if (window.auth) {
                    window.auth.currentUser = null;
                    window.auth.notify();
                }
                const owner = JSON.parse(localStorage.getItem("bkdk_owner"));
                window.location.hash = `#u/${owner ? owner.handle : "wonderduo"}`;
                return;
            }
            
            localStorage.setItem("bkdk_owner_logged_in", "true");
            
            const owner = JSON.parse(localStorage.getItem("bkdk_owner")) || docSnap.data();
            if (window.auth) {
                window.auth.currentUser = owner;
                window.auth.notify();
            }
            window.location.hash = "#dashboard";
        } catch (e) {
            console.error("Google Authentication failed", e);
        }
    };

    window.firebaseLoginWithPassword = async (emailOrUsername, password) => {
        try {
            const docSnap = await getDoc(ownerDocRef);
            if (docSnap.exists()) {
                const ownerData = docSnap.data();
                const emailMatch = ownerData.adminEmail && emailOrUsername.toLowerCase() === ownerData.adminEmail.toLowerCase();
                const handleMatch = ownerData.handle && emailOrUsername.toLowerCase() === ownerData.handle.toLowerCase();
                const passwordMatch = ownerData.adminPassword && password === ownerData.adminPassword;
                
                if ((emailMatch || handleMatch) && passwordMatch) {
                    localStorage.setItem("bkdk_owner", JSON.stringify(ownerData));
                    localStorage.setItem("bkdk_owner_logged_in", "true");
                    if (window.auth) {
                        window.auth.currentUser = ownerData;
                        window.auth.notify();
                    }
                    return ownerData;
                }
            }
            throw new Error("Invalid username/email or password.");
        } catch (e) {
            console.error("Password login failed", e);
            throw e;
        }
    };

    window.firebaseLogout = async () => {
        try {
            await signOut(auth);
            localStorage.setItem("bkdk_owner_logged_in", "false");
            if (window.auth) {
                window.auth.currentUser = null;
                window.auth.notify();
            }
            window.location.hash = "#";
        } catch (e) {
            console.error("Logout failed", e);
        }
    };

    // Listen to Firebase Auth state
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            const docSnap = await getDoc(ownerDocRef);
            if (docSnap.exists()) {
                const data = docSnap.data();
                const adminEmail = data.adminEmail || "";
                
                if (adminEmail && user.email !== adminEmail) {
                    await signOut(auth);
                    localStorage.setItem("bkdk_owner_logged_in", "false");
                    if (window.auth) {
                        window.auth.currentUser = null;
                        window.auth.notify();
                    }
                    const owner = JSON.parse(localStorage.getItem("bkdk_owner"));
                    window.location.hash = `#u/${owner ? owner.handle : "wonderduo"}`;
                    return;
                }
            }
            localStorage.setItem("bkdk_owner_logged_in", "true");
            let owner = JSON.parse(localStorage.getItem("bkdk_owner"));
            if (!owner && docSnap && docSnap.exists()) {
                owner = docSnap.data();
                localStorage.setItem("bkdk_owner", JSON.stringify(owner));
            }
            if (window.auth) {
                window.auth.currentUser = owner;
                window.auth.notify();
            }
        } else {
            localStorage.setItem("bkdk_owner_logged_in", "false");
            if (window.auth) {
                window.auth.currentUser = null;
                window.auth.notify();
            }
        }
    });

} else {
    window.FIREBASE_ACTIVE = false;
}
