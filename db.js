// BkDk Personal Database Service (Single-User Owner)

const DEFAULT_OWNER = {
    id: "owner_bkdk",
    handle: "wonderduo",
    displayName: "wonder duo 💥🥦",
    avatar: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><defs><linearGradient id='bkdk-grad' x1='0%' y1='0%' x2='100%' y2='100%'><stop offset='0%' stop-color='%2300ffcc'/><stop offset='100%' stop-color='%23ff5e00'/></linearGradient></defs><circle cx='50' cy='50' r='50' fill='url(%23bkdk-grad)'/><text x='50' y='65' font-size='42' text-anchor='middle'>💥</text></svg>",
    header: "default",
    landingBio: "⊹₊˚‧︵‿₊୨ᰔ WONDERDUO Q&A ᰔ ୧₊‿︵‧˚₊⊹\n╰┈➤ BakuDeku Q&A and writing corner.\n\n.ᐟ Welcome! I’m Rue (or Rory!)—part-time AU writer, full-time BakuDeku enthusiast, and professional shipper of the Wonder Duo. 💥🥦 I spend 90% of my time thinking about their rival-to-lovers arc and 10% actually writing fics.\n\n⤹⤷ System Log: This page is my digital fallout shelter for all things bkdk. Feed my inbox with prompts, headcanons, questions, or just share your favorite scenes! Let's talk about our favorite boys. 🧡💚",
    bio: "💥 Welcome to our explosive corner of the internet! Just another space for bkdk fanfics, headcanons, and the wonder duo itself. Feed our inbox with prompts, questions, ship discussions, or just say hi! 🥦\n\n.ᐟ Comfort zones: multishipping-friendly, au-maker, but bkdk is our absolute main. Ask us anything!",
    sidebarBio: "wonder duo • she/they\nwriting fics & au threads\nbkdk is my hyperfixation\nask me anything!",
    website: "x.com",
    askPrompt: "Type your question here...",
    askPlaceholder: "Type your question here...",
    askTitle: "Ask us anything! 💥🥦",
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

const DEFAULT_QUESTIONS = [
    {
        id: "q_first",
        targetUserId: "owner_bkdk",
        senderName: "anon",
        text: "hello!!! what's your favorite bkdk trope to write?",
        createdAt: new Date(Date.now() - 3600000 * 24 * 3).toISOString(),
        answeredAt: new Date(Date.now() - 3600000 * 24 * 3).toISOString(),
        answer: "definitely childhood friends to rivals to lovers, but with a heavy dose of pining and mutual protection! i love the absolute trust between them in the later arcs 🧡💚",
        likes: ["visitor_1", "visitor_2"],
        isAnonymous: true
    },
    {
        id: "q_second",
        targetUserId: "owner_bkdk",
        senderName: "dynamight_fan",
        text: "will you post a new au thread soon?",
        createdAt: new Date(Date.now() - 3600000 * 24 * 10).toISOString(),
        answeredAt: new Date(Date.now() - 3600000 * 24 * 8).toISOString(),
        answer: "yes!!! currently drafting a fantasy au where dekuxdragon/bakugou dragon rider 👀 coming soon!",
        likes: ["visitor_3"],
        isAnonymous: false
    },
    {
        id: "q_third",
        targetUserId: "owner_bkdk",
        senderName: "anon",
        text: "if you could change one scene in mha, what would it be?",
        createdAt: new Date(Date.now() - 3600000 * 24 * 20).toISOString(),
        answeredAt: new Date(Date.now() - 3600000 * 24 * 18).toISOString(),
        answer: "make their fight in ground beta even longer and have them actually talk it out more. they're so loud but they say so much with their actions! plus, more tears of course lol",
        likes: ["visitor_1"],
        isAnonymous: true
    },
    {
        id: "q_fourth",
        targetUserId: "owner_bkdk",
        senderName: "kacchan_luv",
        text: "your writing style is so soft i love it 🥺",
        createdAt: new Date(Date.now() - 3600000 * 24 * 30).toISOString(),
        answeredAt: new Date(Date.now() - 3600000 * 24 * 30).toISOString(),
        answer: "omg thank you so much!!! that means the world to me, writing them brings me so much joy 🧡💚",
        likes: ["visitor_4", "visitor_5", "visitor_6"],
        isAnonymous: false
    }
];

class DBService {
    constructor() {
        this.init();
    }

    init() {
        if (!localStorage.getItem("bkdk_owner")) {
            localStorage.setItem("bkdk_owner", JSON.stringify(DEFAULT_OWNER));
        } else {
            const owner = JSON.parse(localStorage.getItem("bkdk_owner"));
            let changed = false;
            if (owner.adminEmail === undefined) {
                owner.adminEmail = "";
                changed = true;
            }
            if (owner.adminPassword === undefined) {
                owner.adminPassword = "";
                changed = true;
            }
            if (owner.landingBio === undefined) {
                owner.landingBio = DEFAULT_OWNER.landingBio;
                changed = true;
            }
            if (owner.askTitle === undefined) {
                owner.askTitle = "Ask us anything! 💥🥦";
                changed = true;
            }
            if (changed) {
                localStorage.setItem("bkdk_owner", JSON.stringify(owner));
            }
        }
        if (!localStorage.getItem("bkdk_questions")) {
            localStorage.setItem("bkdk_questions", JSON.stringify(DEFAULT_QUESTIONS));
        } else {
            const questions = JSON.parse(localStorage.getItem("bkdk_questions"));
            let updated = false;
            questions.forEach(q => {
                if (q.isAnonymous === undefined) {
                    const isAnon = !q.senderName || q.senderName === "Anonymous" || q.senderName.toLowerCase().startsWith("anon");
                    q.isAnonymous = isAnon;
                    updated = true;
                }
            });
            if (updated) {
                localStorage.setItem("bkdk_questions", JSON.stringify(questions));
            }
        }
    }

    getOwner() {
        return JSON.parse(localStorage.getItem("bkdk_owner"));
    }

    saveOwner(ownerData) {
        const owner = { ...this.getOwner(), ...ownerData };
        localStorage.setItem("bkdk_owner", JSON.stringify(owner));
        if (window.FIREBASE_ACTIVE && window.firebaseSaveOwner) {
            window.firebaseSaveOwner(owner);
        }
        return owner;
    }

    getQuestions() {
        return JSON.parse(localStorage.getItem("bkdk_questions"));
    }

    getInboxQuestions() {
        const questions = this.getQuestions();
        return questions.filter(q => q.answer === null);
    }

    getPublicQA() {
        const questions = this.getQuestions();
        return questions.filter(q => q.answer !== null || q.isPost)
            .sort((a, b) => {
                const pinA = a.pinned ? 1 : 0;
                const pinB = b.pinned ? 1 : 0;
                if (pinA !== pinB) return pinB - pinA;
                return new Date(b.answeredAt || b.createdAt) - new Date(a.answeredAt || a.createdAt);
            });
    }

    askQuestion(text, senderName, isAnonymous, parentQuestionId = null) {
        if (window.FIREBASE_ACTIVE && window.firebaseAskQuestion) {
            window.firebaseAskQuestion(text, senderName, isAnonymous, parentQuestionId);
            return;
        }
        const questions = this.getQuestions();
        const newQ = {
            id: "q_" + Date.now() + "_" + Math.random().toString(36).substr(2, 5),
            targetUserId: "owner_bkdk",
            senderName: isAnonymous ? "Anonymous" : (senderName ? senderName.trim() : "Friend"),
            text: text,
            createdAt: new Date().toISOString(),
            answeredAt: null,
            answer: null,
            likes: [],
            comments: [],
            parentQuestionId: parentQuestionId,
            isAnonymous: !!isAnonymous
        };
        questions.push(newQ);
        localStorage.setItem("bkdk_questions", JSON.stringify(questions));
        return newQ;
    }

    createPost(text, parentQuestionId = null) {
        if (window.FIREBASE_ACTIVE && window.firebaseCreatePost) {
            window.firebaseCreatePost(text, parentQuestionId);
            return;
        }
        const questions = this.getQuestions();
        const newPost = {
            id: "q_" + Date.now() + "_" + Math.random().toString(36).substr(2, 5),
            targetUserId: "owner_bkdk",
            senderName: null,
            text: "",
            isPost: true,
            createdAt: new Date().toISOString(),
            answeredAt: new Date().toISOString(),
            answer: text,
            likes: [],
            comments: [],
            parentQuestionId: parentQuestionId
        };
        questions.push(newPost);
        localStorage.setItem("bkdk_questions", JSON.stringify(questions));
        return newPost;
    }

    addComment(itemId, text, senderName) {
        if (window.FIREBASE_ACTIVE && window.firebaseAddComment) {
            window.firebaseAddComment(itemId, text, senderName);
            return;
        }
        const questions = this.getQuestions();
        const index = questions.findIndex(q => q.id === itemId);
        if (index !== -1) {
            if (!questions[index].comments) {
                questions[index].comments = [];
            }
            const newComment = {
                id: "c_" + Date.now() + "_" + Math.random().toString(36).substr(2, 5),
                senderName: senderName ? senderName.trim() : "Anonymous",
                text: text,
                createdAt: new Date().toISOString()
            };
            questions[index].comments.push(newComment);
            localStorage.setItem("bkdk_questions", JSON.stringify(questions));
            return newComment;
        }
        return null;
    }

    answerQuestion(questionId, answerText) {
        if (window.FIREBASE_ACTIVE && window.firebaseAnswerQuestion) {
            window.firebaseAnswerQuestion(questionId, answerText);
            return;
        }
        const questions = this.getQuestions();
        const index = questions.findIndex(q => q.id === questionId);
        if (index !== -1) {
            questions[index].answer = answerText;
            questions[index].answeredAt = new Date().toISOString();
            localStorage.setItem("bkdk_questions", JSON.stringify(questions));
            return questions[index];
        }
        return null;
    }

    updateQuestionSenderName(questionId, newName) {
        if (window.FIREBASE_ACTIVE && window.firebaseUpdateSenderName) {
            window.firebaseUpdateSenderName(questionId, newName);
            return;
        }
        const questions = this.getQuestions();
        const index = questions.findIndex(q => q.id === questionId);
        if (index !== -1) {
            questions[index].senderName = newName ? newName.trim() : "Anonymous";
            localStorage.setItem("bkdk_questions", JSON.stringify(questions));
            return questions[index];
        }
        return null;
    }

    deleteQuestion(questionId) {
        let questions = this.getQuestions();
        questions = questions.filter(q => q.id !== questionId);
        localStorage.setItem("bkdk_questions", JSON.stringify(questions));

        if (window.FIREBASE_ACTIVE && window.firebaseDeleteQuestion) {
            window.firebaseDeleteQuestion(questionId);
        }
    }

    togglePinQuestion(questionId) {
        const questions = this.getQuestions();
        const index = questions.findIndex(q => q.id === questionId);
        if (index !== -1) {
            questions[index].pinned = !questions[index].pinned;
            localStorage.setItem("bkdk_questions", JSON.stringify(questions));

            if (window.FIREBASE_ACTIVE && window.firebaseUpdateQuestion) {
                window.firebaseUpdateQuestion(questionId, { pinned: questions[index].pinned });
            }
            return questions[index];
        }
        return null;
    }

    likeAnswer(questionId, visitorSessionId) {
        if (window.FIREBASE_ACTIVE && window.firebaseLikeAnswer) {
            window.firebaseLikeAnswer(questionId, visitorSessionId);
        }
        const questions = this.getQuestions();
        const index = questions.findIndex(q => q.id === questionId);
        if (index !== -1) {
            const likes = questions[index].likes || [];
            const userIndex = likes.indexOf(visitorSessionId);
            if (userIndex === -1) {
                likes.push(visitorSessionId);
            } else {
                likes.splice(userIndex, 1);
            }
            questions[index].likes = likes;
            localStorage.setItem("bkdk_questions", JSON.stringify(questions));
            return questions[index];
        }
        return null;
    }
}

window.db = new DBService();
