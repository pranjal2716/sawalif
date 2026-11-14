# New dialogues for modules 5-12. Lines: (who, voice, spelling, arabic, english)
Y = ("You", "m")

DIALOGUES = [
    {
        "id": "d7", "module": "m5", "title": "Lunch with a colleague",
        "setting": "Your colleague Huda suggests lunch near the office.",
        "lines": [
            ("Huda", "f", "yallah nitghadda. shu tabi taakil?", "يلا نتغدى. شو تبي تاكل؟", "Let's have lunch. What do you want to eat?"),
            (*Y, "abi 3aish w diyaay. w inti?", "أبي عيش ودياي. وإنتي؟", "I'd like rice and chicken. And you?"),
            ("Huda", "f", "ana abi samach w salata.", "أنا أبي سمچ وسلطة.", "I'd like fish and salad."),
            (*Y, "haadha 7aar?", "هذا حار؟", "Is this spicy?"),
            ("Huda", "f", "la, mub 7aar. bil 3aafya!", "لا، مب حار. بالعافية!", "No, it's not spicy. Enjoy!"),
            (*Y, "wayid lazeedh! il-7saab 3alay.", "وايد لذيذ! الحساب علي.", "Really tasty! The bill's on me."),
            ("Huda", "f", "la, mashkoor. khallni adfa3 il-marra il-jaaya.", "لا، مشكور. خلني أدفع المرة الجاية.", "No, thanks. Let me pay next time."),
        ],
        "questions": [
            ("What do you order?", ["Fish and salad", "Rice and chicken", "Bread and dates"], 1),
            ("Is the food spicy?", ["Yes, very", "No", "A little"], 1),
            ("Who says they'll pay this time?", ["You", "Huda", "Nobody"], 0),
        ],
    },
    {
        "id": "d8", "module": "m5", "title": "Takeaway order",
        "setting": "You stop at a cafeteria on the way home.",
        "lines": [
            ("Worker", "f", "hala! hni walla safari?", "هلا! هني ولا سفري؟", "Hi! For here or takeaway?"),
            (*Y, "safari, law sama7t. abi khubz w 3aseer.", "سفري، لو سمحت. أبي خبز وعصير.", "Takeaway, please. I'd like bread and juice."),
            ("Worker", "f", "3aseer baarid?", "عصير بارد؟", "Cold juice?"),
            (*Y, "ee, baarid. w zeed shway khubz.", "إي، بارد. وزيد شوي خبز.", "Yes, cold. And add a bit more bread."),
            ("Worker", "f", "zain. 3ashreen dirham.", "زين. عشرين درهم.", "OK. Twenty dirhams."),
            (*Y, "tfaddal. khall il-baagi.", "تفضل. خل الباقي.", "Here you go. Keep the change."),
        ],
        "questions": [
            ("Is the order for here or takeaway?", ["For here", "Takeaway", "Delivery"], 1),
            ("How much is it?", ["Twelve dirhams", "Twenty dirhams", "Two hundred dirhams"], 1),
        ],
    },
    {
        "id": "d9", "module": "m6", "title": "Perfume at the souk",
        "setting": "You're looking for oud at a perfume shop in Deira.",
        "lines": [
            ("Seller", "f", "ahlan! shu tabi?", "أهلا! شو تبي؟", "Welcome! What are you looking for?"),
            (*Y, "abi dihn 3ood. agdar ashimmah?", "أبي دهن عود. أقدر أشمه؟", "I'd like oud oil. Can I smell it?"),
            ("Seller", "f", "akeed, tfaddal. haadha yideed.", "أكيد، تفضل. هذا يديد.", "Of course, go ahead. This one is new."),
            (*Y, "7ilu wayid. bkam?", "حلو وايد. بكم؟", "Very nice. How much?"),
            ("Seller", "f", "khams imya dirham.", "خمس مية درهم.", "Five hundred dirhams."),
            (*Y, "ghaali wayid! aakhir si3r?", "غالي وايد! آخر سعر؟", "Too expensive! What's your last price?"),
            ("Seller", "f", "7aggak arba3 imya, w bukhoor hadiyya.", "حقك أربع مية، وبخور هدية.", "For you, four hundred, and incense as a gift."),
            (*Y, "zain, baakhdhah.", "زين، باخذه.", "OK, I'll take it."),
        ],
        "questions": [
            ("What are you buying?", ["Gold", "Oud oil", "Clothes"], 1),
            ("What is the first price?", ["400 dirhams", "500 dirhams", "50 dirhams"], 1),
            ("What do you get as a gift?", ["Incense", "A bag", "Dates"], 0),
        ],
    },
    {
        "id": "d10", "module": "m6", "title": "Exchanging a shirt",
        "setting": "A shirt you bought doesn't fit, so you go back to the mall.",
        "lines": [
            (*Y, "law sama7t, abi abaddil haadha. mub 3ala magaasi.", "لو سمحت، أبي أبدل هذا. مب على مقاسي.", "Excuse me, I want to exchange this. It doesn't fit me."),
            ("Assistant", "f", "chibeer walla sagheer?", "چبير ولا صغير؟", "Too big or too small?"),
            (*Y, "chibeer wayid. 3indkum asghar?", "چبير وايد. عندكم أصغر؟", "Much too big. Do you have a smaller one?"),
            ("Assistant", "f", "ee, bas bloon azrag. ma fi abyadh.", "إي، بس بلون أزرق. ما في أبيض.", "Yes, but in blue. There's no white."),
            (*Y, "ma yikhaalif, azrag zain.", "ما يخالف، أزرق زين.", "No problem, blue is fine."),
        ],
        "questions": [
            ("What's wrong with the shirt?", ["It's broken", "It's too big", "It's too small"], 1),
            ("What colour is available?", ["White", "Blue", "Black"], 1),
        ],
    },
    {
        "id": "d11", "module": "m7", "title": "Running late",
        "setting": "Your friend Shamma calls while you're stuck in traffic.",
        "lines": [
            ("Shamma", "f", "alo? wainak?", "ألو؟ وينك؟", "Hello? Where are you?"),
            (*Y, "ana fi it-tareeg. fi za7ma wayid.", "أنا في الطريق. في زحمة وايد.", "I'm on my way. There's a lot of traffic."),
            ("Shamma", "f", "mita tooSal?", "متى توصل؟", "When will you arrive?"),
            (*Y, "ba3d 3ashar dagaayig. ta'akhkhart, aasif.", "بعد عشر دقايق. تأخرت، آسف.", "In ten minutes. I'm late, sorry."),
            ("Shamma", "f", "ma yikhaalif. tarrish li il-lokeishan.", "ما يخالف. طرش لي اللوكيشن.", "No problem. Send me your location."),
            (*Y, "zain, batarrishah al7een.", "زين، بطرشه الحين.", "OK, I'll send it now."),
        ],
        "questions": [
            ("Why are you late?", ["You forgot", "Traffic", "Your battery died"], 1),
            ("When will you arrive?", ["In ten minutes", "In an hour", "Tomorrow"], 0),
            ("What does Shamma ask you to send?", ["A message", "Your location", "A photo"], 1),
        ],
    },
    {
        "id": "d12", "module": "m7", "title": "Weekend plans",
        "setting": "Arranging to meet a friend at the weekend.",
        "lines": [
            ("Friend", "f", "inta faadhi il-wiikend?", "إنت فاضي الويكند؟", "Are you free at the weekend?"),
            (*Y, "yimkin. il-yoom ma 3indi wagt, bas baachir faadhi.", "يمكن. اليوم ما عندي وقت، بس باجر فاضي.", "Maybe. Today I don't have time, but tomorrow I'm free."),
            ("Friend", "f", "zain! khalna nitlaaga baachir.", "زين! خلنا نتلاقى باجر.", "Great! Let's meet tomorrow."),
            (*Y, "wain nitlaaga? w ay saa3a?", "وين نتلاقى؟ وأي ساعة؟", "Where shall we meet? And what time?"),
            ("Friend", "f", "fil mool, is-saa3a sab3.", "في المول، الساعة سبع.", "At the mall, at seven."),
            (*Y, "akeed. ashoofich baachir!", "أكيد. أشوفچ باجر!", "Sure. See you tomorrow!"),
        ],
        "questions": [
            ("When are you free?", ["Today", "Tomorrow", "Not at all"], 1),
            ("Where will you meet?", ["At the mall", "At the beach", "At the office"], 0),
            ("At what time?", ["Six", "Seven", "Eight"], 1),
        ],
    },
    {
        "id": "d13", "module": "m8", "title": "Project check-in",
        "setting": "A quick call with your manager about a report.",
        "lines": [
            ("Manager", "f", "mita yikhallis it-tagreer?", "متى يخلص التقرير؟", "When will the report be finished?"),
            (*Y, "khallast nuss. batarrishah baachir.", "خلصت نص. بطرشه باجر.", "I've finished half. I'll send it tomorrow."),
            ("Manager", "f", "haadha musta3jal. il-3ameel yabaah il-yoom.", "هذا مستعجل. العميل يباه اليوم.", "It's urgent. The client wants it today."),
            (*Y, "zain, khal ashoof w arudd 3aleech.", "زين، خل أشوف وأرد عليچ.", "OK, let me check and get back to you."),
            ("Manager", "f", "mashkoor 3ala jahdak.", "مشكور على جهدك.", "Thanks for your effort."),
        ],
        "questions": [
            ("How much of the report is done?", ["All of it", "Half", "None"], 1),
            ("Who wants the report today?", ["The client", "The team", "The supplier"], 0),
        ],
    },
    {
        "id": "d14", "module": "m8", "title": "Signing the contract",
        "setting": "A meeting with a supplier to close a deal.",
        "lines": [
            ("Supplier", "f", "haadha il-3agd. shu raayak?", "هذا العقد. شو رأيك؟", "Here's the contract. What do you think?"),
            (*Y, "zain, bas fi mushkila fil taklifa.", "زين، بس في مشكلة في التكلفة.", "Good, but there's a problem with the cost."),
            ("Supplier", "f", "nagdar nnazzil shway.", "نقدر ننزل شوي.", "We can go down a little."),
            (*Y, "fikra zaina. ana mittafig.", "فكرة زينة. أنا متفق.", "Good idea. I agree."),
            ("Supplier", "f", "zain, waggi3 hni law sama7t. mabrook!", "زين، وقع هني لو سمحت. مبروك!", "OK, sign here please. Congratulations!"),
            (*Y, "allah ybaarik feek. bit-tawfeeg!", "الله يبارك فيك. بالتوفيق!", "Thank you. Good luck!"),
        ],
        "questions": [
            ("What's the problem?", ["The deadline", "The cost", "The team"], 1),
            ("What do you do at the end?", ["Cancel", "Sign", "Postpone"], 1),
        ],
    },
    {
        "id": "d15", "module": "m9", "title": "The AC is broken",
        "setting": "You call building maintenance on a hot afternoon.",
        "lines": [
            ("Maintenance", "f", "alo, siyaana. tfaddal.", "ألو، صيانة. تفضل.", "Hello, maintenance. Go ahead."),
            (*Y, "il-mukayyif kharbaan, w il-jaw 7aar wayid.", "المكيف خربان، والجو حار وايد.", "The AC is broken, and it's very hot."),
            ("Maintenance", "f", "ay taabig? w ragm ish-shagga?", "أي طابق؟ ورقم الشقة؟", "Which floor? And the apartment number?"),
            (*Y, "it-taabig il-khaamis, shagga khams imya w waa7id.", "الطابق الخامس، شقة خمس مية وواحد.", "The fifth floor, apartment 501."),
            ("Maintenance", "f", "zain, yaay ba3d nuss saa3a.", "زين، ياي بعد نص ساعة.", "OK, I'm coming in half an hour."),
            (*Y, "mashkoor. il-baab maftoo7.", "مشكور. الباب مفتوح.", "Thanks. The door is open."),
        ],
        "questions": [
            ("What's broken?", ["The AC", "The lift", "The light"], 0),
            ("Which apartment is it?", ["105", "501", "15"], 1),
            ("When is maintenance coming?", ["Tomorrow", "In half an hour", "In ten minutes"], 1),
        ],
    },
    {
        "id": "d16", "module": "m9", "title": "A delivery at the door",
        "setting": "A courier calls from downstairs.",
        "lines": [
            ("Courier", "f", "as-salaamu 3alaikum. 3indi shi7na lik.", "السلام عليكم. عندي شحنة لك.", "Peace be upon you. I have a parcel for you."),
            (*Y, "wa 3alaikum as-salaam. ana foog, itla3.", "وعليكم السلام. أنا فوق، اطلع.", "And upon you peace. I'm upstairs, come up."),
            ("Courier", "f", "il-mas3ad kharbaan.", "المصعد خربان.", "The lift is broken."),
            (*Y, "ma3laish. khallah 3ind il-7aaris ta7t.", "معليش. خله عند الحارس تحت.", "Sorry about that. Leave it with the guard downstairs."),
            ("Courier", "f", "zain, ma fi mushkila.", "زين، ما في مشكلة.", "OK, no problem."),
        ],
        "questions": [
            ("Why can't the courier come up easily?", ["The lift is broken", "The door is closed", "There's traffic"], 0),
            ("Where should he leave the parcel?", ["At your door", "With the guard downstairs", "At the office"], 1),
        ],
    },
    {
        "id": "d17", "module": "m10", "title": "At the pharmacy",
        "setting": "You have a headache and a fever.",
        "lines": [
            ("Pharmacist", "f", "hala, shu fik?", "هلا، شو فيك؟", "Hi, what's wrong?"),
            (*Y, "raasi y3awwirni, w 3indi 7umma.", "راسي يعورني، وعندي حمى.", "My head hurts, and I have a fever."),
            ("Pharmacist", "f", "3indak 7assaasiyya min ay dawa?", "عندك حساسية من أي دوا؟", "Are you allergic to any medicine?"),
            (*Y, "la, ma 3indi.", "لا، ما عندي.", "No, I'm not."),
            ("Pharmacist", "f", "haadhi 7boob. marratain fil yoom, ba3d il-akil.", "هذي حبوب. مرتين في اليوم، بعد الأكل.", "These are pills. Twice a day, after food."),
            ("Pharmacist", "f", "w ti7taaj raa7a. salaamtak!", "وتحتاج راحة. سلامتك!", "And you need rest. Get well soon!"),
            (*Y, "allah ysallmich.", "الله يسلمچ.", "Thank you (God keep you safe)."),
        ],
        "questions": [
            ("What are your symptoms?", ["Stomach ache and cough", "Headache and fever", "Back pain"], 1),
            ("How often should you take the pills?", ["Once a day", "Twice a day", "Three times a day"], 1),
            ("When should you take them?", ["Before food", "After food", "At night only"], 1),
        ],
    },
    {
        "id": "d18", "module": "m10", "title": "A colleague isn't well",
        "setting": "Your colleague Aisha looks pale at the office.",
        "lines": [
            (*Y, "inti zaina? shakhbaarich?", "إنتي زينة؟ شخبارچ؟", "Are you OK? How are things?"),
            ("Aisha", "f", "la, ana mareedha. batni y3awwirni.", "لا، أنا مريضة. بطني يعورني.", "No, I'm sick. My stomach hurts."),
            (*Y, "ti7taajeen daktoor? fi 3iyaada gareeb.", "تحتاجين دكتور؟ في عيادة قريب.", "Do you need a doctor? There's a clinic nearby."),
            ("Aisha", "f", "la, 3aadi. barou7 il-bait w artaa7.", "لا، عادي. بروح البيت وأرتاح.", "No, it's fine. I'll go home and rest."),
            (*Y, "zain. salaamtich!", "زين. سلامتچ!", "OK. Get well soon!"),
        ],
        "questions": [
            ("What's wrong with Aisha?", ["Headache", "Stomach ache", "Toothache"], 1),
            ("What does she decide to do?", ["Go to the clinic", "Go home and rest", "Keep working"], 1),
        ],
    },
    {
        "id": "d19", "module": "m11", "title": "Monday small talk",
        "setting": "Coffee with a colleague after the weekend.",
        "lines": [
            ("Colleague", "f", "shlon kaan il-wiikend? shu sawwait?", "شلون كان الويكند؟ شو سويت؟", "How was the weekend? What did you do?"),
            (*Y, "kaan zain. ri7t il-ba7ar ma3a rab3i.", "كان زين. رحت البحر مع ربعي.", "It was good. I went to the beach with friends."),
            ("Colleague", "f", "sidj? il-jaw 7aar wayid!", "صدج؟ الجو حار وايد!", "Really? It's so hot!"),
            (*Y, "ee, w ir-rtooba wayid. bas kaan 7ilu.", "إي، والرطوبة وايد. بس كان حلو.", "Yes, and very humid. But it was nice."),
            ("Colleague", "f", "ana ma sawwait shay. kint ta3baana.", "أنا ما سويت شي. كنت تعبانة.", "I didn't do anything. I was tired."),
        ],
        "questions": [
            ("Where did you go?", ["The desert", "The beach", "The mall"], 1),
            ("What did your colleague do?", ["Nothing", "Travelled", "Went to the gym"], 0),
        ],
    },
    {
        "id": "d20", "module": "m11", "title": "Eid greetings",
        "setting": "You meet your neighbour on the first day of Eid.",
        "lines": [
            (*Y, "3eed mubaarak!", "عيد مبارك!", "Eid Mubarak!"),
            ("Neighbour", "f", "3asaakum min 3uwwaada! min zamaan, wainak?", "عساكم من عواده! من زمان، وينك؟", "May you see it again! It's been ages, where have you been?"),
            (*Y, "kint msaafir. rija3t il-baar7a.", "كنت مسافر. رجعت البارحة.", "I was travelling. I came back last night."),
            ("Neighbour", "f", "7ayyaak allah! tfaddal, gahwa?", "حياك الله! تفضل، قهوة؟", "Welcome! Please, some coffee?"),
            (*Y, "mashkoor, 3ala raasi.", "مشكور، على راسي.", "Thank you, with pleasure."),
        ],
        "questions": [
            ("Where were you?", ["At work", "Travelling", "Sick at home"], 1),
            ("When did you come back?", ["Last night", "A week ago", "This morning"], 0),
            ("What does your neighbour offer?", ["Dates", "Coffee", "Lunch"], 1),
        ],
    },
    {
        "id": "d21", "module": "m12", "title": "What happened yesterday?",
        "setting": "A friend wants to know why you missed dinner.",
        "lines": [
            ("Friend", "f", "il-baar7a ma yeet! shu saar?", "البارحة ما ييت! شو صار؟", "You didn't come last night! What happened?"),
            (*Y, "saalfa tweela. awwal, il-batri khalas.", "سالفة طويلة. أول، البطري خلص.", "Long story. First, my battery died."),
            (*Y, "w ba3dain, fij'a, il-mukayyif kharab fil sayyaara.", "وبعدين، فجأة، المكيف خرب في السيارة.", "And then, suddenly, the AC broke in the car."),
            ("Friend", "f", "sidj? w ba3dain?", "صدج؟ وبعدين؟", "Really? And then?"),
            (*Y, "fil aakhir ri7t il-bait w nimt, 3ashaan kint ta3baan.", "في الآخر رحت البيت ونمت، عشان كنت تعبان.", "In the end I went home and slept, because I was tired."),
        ],
        "questions": [
            ("What happened first?", ["Your battery died", "You got lost", "You got sick"], 0),
            ("What broke in the car?", ["The door", "The AC", "The light"], 1),
            ("Why did you go to sleep?", ["You were tired", "You were bored", "It was late"], 0),
        ],
    },
    {
        "id": "d22", "module": "m12", "title": "Plans for next year",
        "setting": "Chatting with a colleague about the future.",
        "lines": [
            ("Colleague", "f", "saar lak wayid fi dbai?", "صار لك وايد في دبي؟", "Have you been in Dubai long?"),
            (*Y, "ee, saar li fi dbai sanawaat.", "إي، صار لي في دبي سنوات.", "Yes, I've been in Dubai for years."),
            ("Colleague", "f", "w shu naawi is-sana il-jaaya?", "وشو ناوي السنة الجاية؟", "And what are you planning next year?"),
            (*Y, "ana naawi at3allam 3arabi zain, 3ashaan atkallam ma3a il-3umala.", "أنا ناوي أتعلم عربي زين، عشان أتكلم مع العملاء.", "I'm planning to learn Arabic well, so I can talk with clients."),
            ("Colleague", "f", "mashallah! bit-tawfeeg.", "ما شاء الله! بالتوفيق.", "Wonderful! Good luck."),
        ],
        "questions": [
            ("How long have you been in Dubai?", ["A few months", "Years", "One week"], 1),
            ("What are you planning?", ["To travel", "To learn Arabic well", "To change jobs"], 1),
        ],
    },
]
