const categoryProfiles = {
  cultivation: {
    label: "修行感悟",
    choices: [
      ["静心参悟", "稳妥体会其中道理。", "steady"],
      ["与其论法", "借此机会相互印证。", "bond"],
      ["依本心而行", "不拘成法，自行作答。", "free"]
    ]
  },
  duel: {
    label: "斗法因缘",
    choices: [
      ["应下战帖", "进行一场不计段位的切磋。", "danger"],
      ["拆招论法", "不争输赢，只谈招式。", "bond"],
      ["暂避锋芒", "保存精力，改日再会。", "free"]
    ]
  },
  dungeon: {
    label: "秘境见闻",
    choices: [
      ["并肩查探", "共同追查秘境异动。", "danger"],
      ["分享所得", "以所得线索换一份人情。", "bond"],
      ["独自记下", "将线索收入札记。", "free"]
    ]
  },
  sect: {
    label: "宗门风云",
    choices: [
      ["出面担责", "主动介入宗门事务。", "danger"],
      ["从中斡旋", "在人情与宗规间求取平衡。", "bond"],
      ["交由执事", "遵循宗门既有规矩。", "free"]
    ]
  },
  relationship: {
    label: "人物因缘",
    choices: [
      ["坦诚相待", "以真心回应对方。", "bond"],
      ["相互试探", "保留余地，观察来意。", "steady"],
      ["礼数周全", "不深交，也不失礼。", "free"]
    ]
  },
  market: {
    label: "坊市轶闻",
    choices: [
      ["查个明白", "花些心力追查真相。", "danger"],
      ["与人合谋", "借助对方的人脉处理。", "bond"],
      ["见好就收", "不让贪念牵动道心。", "free"]
    ]
  }
};

const standaloneSeeds = [
  ["rain-scroll", "雨夜残卷", "夜雨敲窗，{actor}送来半卷被水浸过的功法，请你一同辨认缺失的经文。", "sameRoot", "cultivation"],
  ["meridian-doubt", "经脉疑云", "{actor}修炼时气息逆行，却坚持自己并未走错周天。", "sectMate", "cultivation"],
  ["cliff-inscription", "崖壁旧字", "后山石壁浮现古字，{actor}认为其中藏着一套吐纳法。", "sameSkill", "cultivation"],
  ["incense-debate", "一炷香论道", "{actor}在香尽之前问你：求长生究竟为了什么？", "randomNpc", "cultivation"],
  ["dream-demon", "梦中心魔", "{actor}说昨夜梦见与你在同一座天门前反目。", "recentOpponent", "cultivation"],
  ["root-resonance", "灵根共鸣", "你与{actor}擦肩时灵气同时震荡，像是两种灵根在彼此回应。", "sameRoot", "cultivation"],
  ["quiet-cave", "空洞余音", "一座废弃洞府不断传出诵经声，{actor}邀你在子时前往。", "sectMate", "cultivation"],
  ["broken-mantra", "错字真诀", "{actor}发现一篇故意写错的口诀，错处连起来竟另有含义。", "sameSkill", "cultivation"],
  ["task-insight", "尘世有悟", "完成今日的{task}后，你偶有所悟，恰逢{actor}前来论证。", "randomNpc", "cultivation"],
  ["breath-contest", "听息辨境", "{actor}提出蒙眼听息，猜测彼此修为中最薄弱的一环。", "recentOpponent", "cultivation"],
  ["moon-meditation", "月下分席", "月华正盛，{actor}却占了你惯常打坐的石台。", "sectMate", "cultivation"],
  ["nameless-teacher", "无名授业", "一位无名老修留下问题便飘然而去，{actor}坚持与你各写一份答案。", "randomNpc", "cultivation"],

  ["return-challenge", "旧败新帖", "昨日斗法余势未散，{actor}已将新的战帖送到你案前。", "recentOpponent", "duel"],
  ["weaponless-duel", "空手问招", "{actor}提议封住法力，只凭身法与判断切磋。", "recentOpponent", "duel"],
  ["root-counter-study", "克制之问", "{actor}想验证灵根克制是否真能决定一场斗法。", "sameRoot", "duel"],
  ["arena-rumor", "擂台流言", "坊间传言你畏惧{actor}的本命神通，对方亲自来问真假。", "recentOpponent", "duel"],
  ["borrowed-sword", "借剑一试", "{actor}借来一柄陌生飞剑，想请你帮忙试出它的极限。", "sameSkill", "duel"],
  ["three-move-oath", "三招之约", "{actor}扬言三招之内便能逼你后退半步。", "rivalSect", "duel"],
  ["injured-rival", "负伤的对手", "{actor}带伤赴约，却不肯取消早已定下的切磋。", "recentOpponent", "duel"],
  ["public-lessons", "当众拆招", "数名弟子围住{actor}请教昨日战局，对方示意你一同讲解。", "recentOpponent", "duel"],
  ["false-record", "错写的战报", "宗门战报将你与{actor}的胜负写反，引来众人议论。", "recentOpponent", "duel"],
  ["night-arena", "夜半空擂", "月下擂台无人，{actor}却已独自在场中等候。", "rivalSect", "duel"],
  ["skill-mirror", "同术异路", "你与{actor}所修神通相近，用法却截然相反。", "sameSkill", "duel"],
  ["no-winner", "未分胜负", "{actor}坚持上次平局只是意外，必须换一种策略再试。", "recentOpponent", "duel"],

  ["blood-herb", "血谷遗药", "{actor}在血色禁地带回一株不在图鉴中的灵草。", "dungeonPeer", "dungeon"],
  ["missing-map", "残缺洞图", "一张洞窟图缺了最关键的一角，{actor}声称见过对应地形。", "dungeonPeer", "dungeon"],
  ["void-echo", "虚殿回声", "虚天殿战后，{actor}仍能听见妖王低声呼唤自己的名字。", "sectMate", "dungeon"],
  ["sea-flare", "海上灵火", "乱星海深处升起一团不灭灵火，{actor}怀疑那是求救信号。", "dungeonPeer", "dungeon"],
  ["loot-dispute", "归属之争", "一件无主法器落在你与{actor}之间，周围没有旁人作证。", "dungeonPeer", "dungeon"],
  ["monster-cub", "幼兽相随", "一只失去母兽的幼崽悄悄跟着{actor}离开秘境。", "dungeonPeer", "dungeon"],
  ["poison-mark", "掌心毒纹", "{actor}从血色禁地归来后，掌心多出一道逐日蔓延的黑纹。", "sectMate", "dungeon"],
  ["auction-secret", "竞拍暗语", "乱星海竞拍时，{actor}用只有你能听懂的暗语报了一个古怪价格。", "dungeonPeer", "dungeon"],
  ["sealed-door", "第十道门", "血色禁地明明只有九洞，{actor}却说自己看见了第十道门。", "dungeonPeer", "dungeon"],
  ["shared-rescue", "救命之手", "战报记载你曾在妖兽爪下拉了{actor}一把，对方特来还情。", "dungeonPeer", "dungeon"],
  ["stolen-core", "失窃妖核", "宗门分得的妖核不翼而飞，最后的经手人是{actor}。", "sectMate", "dungeon"],
  ["tide-prophecy", "潮声成谶", "{actor}从乱星海潮声中听出下一次妖潮的方位。", "dungeonPeer", "dungeon"],

  ["gate-duty", "山门轮值", "今日守山弟子迟迟未归，{actor}请你暂代山门轮值。", "sectMate", "sect"],
  ["supply-ledger", "物资亏空", "宗门账册少了数十灵石，{actor}是最后一位核对账目的人。", "sectMate", "sect"],
  ["province-refugees", "城下流民", "{province}城外聚集了避乱之人，{actor}主张开仓安置。", "sectMate", "sect"],
  ["enemy-envoy", "敌宗来使", "来自敌宗的{actor}独自入山，声称只愿与你密谈。", "rivalSect", "sect"],
  ["defense-gap", "阵眼有缺", "{actor}发现{province}守阵存在破绽，但修补会抽走前线人手。", "sectMate", "sect"],
  ["merit-dispute", "战功争议", "两份战报都把首功记在自己名下，{actor}请你作证。", "sectMate", "sect"],
  ["elder-order", "长老密令", "一位长老命{actor}绕过宗门议事，直接执行一项秘密差事。", "sectMate", "sect"],
  ["captured-scout", "被俘斥候", "守城弟子抓到一名敌宗斥候，对方竟是你见过的{actor}。", "rivalSect", "sect"],
  ["banner-fall", "战旗坠地", "攻城混战中宗门战旗折断，{actor}冒险将它带了回来。", "sectMate", "sect"],
  ["shared-mine", "两宗共矿", "边境灵矿横跨两宗疆域，{actor}带来一份临时共采契约。", "rivalSect", "sect"],
  ["city-festival", "城中灯会", "{province}新归宗门，{actor}提议借灯会安抚人心。", "sectMate", "sect"],
  ["discipline-case", "执法堂前", "一名弟子因救人违背军令，{actor}希望你在执法堂前陈情。", "sectMate", "sect"],
  ["monster-warning", "妖潮前兆", "{actor}在城外发现大量妖兽迁徙留下的痕迹。", "sectMate", "sect"],
  ["office-invite", "堂口相邀", "{actor}邀请你加入新设堂口，却不肯说明堂口真正职责。", "sectMate", "sect"],
  ["rival-funeral", "敌宗白幡", "敌宗忽然挂起白幡，{actor}请你陪同前往吊唁一位旧敌。", "rivalSect", "sect"],
  ["border-oath", "界碑之誓", "两宗修士在边境剑拔弩张，{actor}提出以个人名义立誓止战三日。", "rivalSect", "sect"],

  ["unexpected-letter", "未署名的信", "一封没有署名的信准确写出了你与{actor}才知道的旧事。", "randomNpc", "relationship"],
  ["birthday-token", "一枚旧物", "{actor}送来一件不起眼的旧物，说它曾陪自己度过最难的一关。", "sectMate", "relationship"],
  ["misheard-words", "传错的话", "有人说你曾在背后轻视{actor}，对方来得很平静。", "randomNpc", "relationship"],
  ["silent-company", "无言同坐", "{actor}没有说来意，只在洞府门前坐了一夜。", "sectMate", "relationship"],
  ["favor-request", "旧情相托", "{actor}请你照看一名素未谋面的后辈，却不解释缘由。", "randomNpc", "relationship"],
  ["shared-secret", "不可外传", "{actor}告诉你一桩足以影响其宗门声誉的秘密。", "rivalSect", "relationship"],
  ["name-question", "如何称呼", "{actor}忽然问起，你一直把彼此当作怎样的人。", "recentOpponent", "relationship"],
  ["wounded-pride", "难言之败", "{actor}输掉关键一战后闭门不出，却只允许你进入。", "recentOpponent", "relationship"],
  ["borrowed-elixir", "未还的丹", "{actor}记得多年前欠下一枚丹药，你却对此毫无印象。", "randomNpc", "relationship"],
  ["same-hometown", "尘世旧乡", "闲谈中你发现{actor}也曾在与你相近的尘世风物中生活。", "randomNpc", "relationship"],
  ["portrait-request", "留影之请", "{actor}想请你替自己挑选一幅传给后人的画像。", "sectMate", "relationship"],
  ["farewell-cup", "临行一杯", "{actor}说将独自远游，只带来一壶酒与你告别。", "randomNpc", "relationship"],

  ["counterfeit-pill", "真假灵丹", "坊市有人售卖与{actor}手中一模一样的丹药，其中必有一枚是假。", "randomNpc", "market"],
  ["silent-auction", "无声竞价", "一场只以神识报价的暗拍即将开始，{actor}递给你入场信物。", "rivalSect", "market"],
  ["old-owner", "法器旧主", "你见过的一件法器被摆上摊位，{actor}却说它本不该离开原主人。", "dungeonPeer", "market"],
  ["spirit-stone-mark", "有记号的灵石", "{actor}收到一批刻有宗门暗记的灵石，来源十分可疑。", "sectMate", "market"],
  ["pearl-crack", "灵珠裂声", "经过一间摊位时，你与{actor}同时听见灵珠碎裂般的轻响。", "sameRoot", "market"],
  ["map-vendor", "只卖一人的地图", "摊主声称秘境图只卖给你或{actor}其中一人。", "dungeonPeer", "market"],
  ["debt-transfer", "转手的人情债", "一名商人拿出{actor}的欠契，提出用极低价格转给你。", "randomNpc", "market"],
  ["closed-shop", "闭门的老铺", "经营百年的老铺突然闭门，{actor}在门缝中发现一张写给你的纸条。", "randomNpc", "market"]
];

// Long-life content pool: each entry has a distinct hook so expansion does not become title-only reskinning.
const expansionSeeds = [
  ["star-sand", "星砂入梦", "{actor}带来一小瓶会在梦中发光的星砂，里面映出你尚未经历的一场离别。", "sameRoot", "cultivation"],
  ["cold-altar", "寒坛问火", "寒坛中的火种即将熄灭，{actor}请你用自己的灵息回答它最后一个问题。", "sameSkill", "cultivation"],
  ["borrowed-breath", "借来一口气", "{actor}渡劫受阻，想借你一口真气，却不肯说归还时要付出什么。", "sectMate", "cultivation"],
  ["paper-crane", "纸鹤指路", "一只没有灵力的纸鹤飞进洞府，{actor}说它只会为真正想求答案的人引路。", "randomNpc", "cultivation"],
  ["stone-heart", "石心有缝", "你在{province}拾到一块有心跳的石头，{actor}认为它正在模仿你的道心。", "rivalSect", "cultivation"],
  ["last-incense", "最后一炷香", "{actor}请你替一位失踪的师长点完最后一炷香，香灰中却藏着另一句遗言。", "sectMate", "cultivation"],
  ["moon-well", "月井倒影", "月井里的倒影比你慢半拍，{actor}坚持那不是幻术，而是另一种可能。", "sameRoot", "cultivation"],
  ["silent-thunder", "无声天雷", "天雷在云中沉默了整夜，{actor}请你陪他听出雷声没有落下的原因。", "sameSkill", "cultivation"],
  ["reverse-scripture", "倒读经页", "{actor}将经书倒过来读，字句竟变成了你近日最不愿面对的念头。", "randomNpc", "cultivation"],
  ["herb-keeper", "守药人的账", "药园每晚少一片叶子，{actor}把账册交给你，却在最后一页写了自己的名字。", "sectMate", "cultivation"],
  ["dawn-step", "破晓三步", "{actor}说只要在日出前走完三步石阶，就能看见自己的瓶颈从何处生出。", "recentOpponent", "cultivation"],
  ["borrowed-shadow", "借影修行", "你和{actor}的影子在地上交换位置，谁也不敢先把它们叫回来。", "sameRoot", "cultivation"],

  ["silent-rematch", "无声复战", "{actor}没有递战帖，只在擂台上留下你上次最后一招的落点。", "recentOpponent", "duel"],
  ["broken-spear", "断枪择主", "一柄断枪在众人面前指向{actor}，对方却请你决定它应不应该再出鞘。", "recentOpponent", "duel"],
  ["borrowed-victory", "借来的胜名", "战报把你的胜利写成了{actor}的功劳，对方来问你是否愿意让这份误会继续。", "recentOpponent", "duel"],
  ["arena-rain", "雨中擂台", "暴雨冲掉了擂台上的所有界线，{actor}说这正适合一场不看境界的切磋。", "rivalSect", "duel"],
  ["sealed-technique", "封术三息", "{actor}提议双方各封住一门本命术法，看看剩下的判断是否足以分出高下。", "sameSkill", "duel"],
  ["watching-apprentice", "旁观的弟子", "一名弟子偷偷模仿你与{actor}的招式，最后一招却来自一段不存在的战局。", "recentOpponent", "duel"],
  ["wrong-sword", "拿错的剑", "{actor}在切磋前拿错了你的剑，剑灵先替你们说出了彼此都没承认的敬意。", "sameSkill", "duel"],
  ["three-breath-bet", "三息赌约", "{actor}押上一件旧法器，只要你能在三息内看穿他的第一步。", "rivalSect", "duel"],
  ["retired-champion", "退场的人", "一位退隐的擂主把最后一张入场券交给{actor}，请你陪他看完这一战。", "recentOpponent", "duel"],
  ["mirror-pavilion", "镜亭问败", "镜亭会把失败重演一次，{actor}想知道你愿不愿意和他一起看第二遍。", "recentOpponent", "duel"],
  ["honor-token", "无主战符", "一枚写着你名字的战符落在{actor}脚边，没人知道它原本属于哪一方。", "randomNpc", "duel"],
  ["late-challenge", "迟来的战帖", "{actor}在闭关三年后才送来战帖，帖上的日期却比你们初见还早。", "recentOpponent", "duel"],

  ["empty-teleport", "空传送阵", "副本出口多出一座没有目的地的传送阵，{actor}问你是否愿意先迈出一步。", "dungeonPeer", "dungeon"],
  ["cold-monster", "不怕冷的妖兽", "血色禁地的妖兽身上结着霜，{actor}认为它来自一处从未记载的洞窟。", "dungeonPeer", "dungeon"],
  ["fallen-banner", "秘境坠旗", "一面不属于任何宗门的旗帜插在乱星海，{actor}说它正在等待下一场战争。", "dungeonPeer", "dungeon"],
  ["loot-that-breathes", "会呼吸的战利品", "你们分到的战利品在夜里轻轻起伏，{actor}坚持先听完它的一段梦话。", "dungeonPeer", "dungeon"],
  ["wrong-map", "地图上的第三条路", "地图只画了两条路，{actor}却在空白处找到一条刚刚出现的墨线。", "dungeonPeer", "dungeon"],
  ["borrowed-lantern", "借来的引魂灯", "{actor}的引魂灯照见了一个不该还留在秘境中的人影。", "dungeonPeer", "dungeon"],
  ["dungeon-oath", "秘境立誓", "一块刻着旧誓的石碑要求所有同行者留下名字，{actor}想替你先写上。", "sectMate", "dungeon"],
  ["last-ration", "最后一份干粮", "秘境里只剩一份灵食，{actor}却把选择权交给了最沉默的那个人。", "dungeonPeer", "dungeon"],
  ["echoing-footsteps", "回头的脚步", "你听见身后的脚步与你完全同步，{actor}却在前方示意你不要回头。", "dungeonPeer", "dungeon"],
  ["dungeon-witness", "秘境证人", "一只会说人话的石兽声称见过你们未来的败退，{actor}请你决定是否相信。", "dungeonPeer", "dungeon"],
  ["stolen-exit", "被偷走的出口", "出口的坐标被人从阵盘上抹去，最后触碰阵盘的人是{actor}。", "dungeonPeer", "dungeon"],
  ["afterimage-reward", "迟到的奖励", "你们离开秘境后，奖励才从虚空落下，其中一件刻着{actor}的旧名。", "dungeonPeer", "dungeon"],

  ["new-bell", "新钟未鸣", "宗门新铸的晨钟始终敲不响，{actor}怀疑钟内封着一段不肯醒来的记忆。", "sectMate", "sect"],
  ["guest-seat", "空着的客席", "宗门议事堂多摆了一席，{actor}说那是给明日可能到来的敌人准备的。", "sectMate", "sect"],
  ["missing-seal", "失踪的令印", "执事令印从库房消失，{actor}带来的证词却让所有人都变成了嫌疑人。", "sectMate", "sect"],
  ["border-lantern", "边城孤灯", "{province}只剩一盏守城灯，{actor}请求你决定灯油应该先给谁。", "sectMate", "sect"],
  ["discipline-appeal", "二次陈情", "那名被罚弟子再次来找你，{actor}说他已经准备好承担更重的代价。", "sectMate", "sect"],
  ["rival-gift", "敌宗贺礼", "敌宗送来一枚看似吉祥的玉佩，{actor}请你在众人面前判断它是否藏着阵法。", "rivalSect", "sect"],
  ["quiet-recruitment", "静默招揽", "{actor}邀请你加入一个没有名册的堂口，只说堂口保护的是宗门的未来。", "sectMate", "sect"],
  ["war-drum-crack", "战鼓裂纹", "战鼓上的裂纹正好组成一张疆域图，{actor}认为有人提前画出了下一场战事。", "sectMate", "sect"],
  ["city-key", "城门钥匙", "{province}的城门钥匙被交到你手中，{actor}说今晚可能有人会来借门。", "sectMate", "sect"],
  ["elder-last-request", "长老最后一愿", "一位长老把未完成的宗门规矩交给{actor}，请你见证它是否值得留下。", "sectMate", "sect"],
  ["traitor-rumor", "内应流言", "流言说敌宗已经买通了宗门一半的弟子，{actor}却只给你看了一张名单。", "rivalSect", "sect"],
  ["shared-fort", "共守孤堡", "两宗边堡同时告急，{actor}提出让两边最不信任的人共同守一夜。", "rivalSect", "sect"],

  ["unopened-gift", "未拆的礼", "{actor}把礼盒放在你门前，却说只有等你忘记它时才可以打开。", "randomNpc", "relationship"],
  ["wrong-name", "叫错的名字", "{actor}在众人面前叫错了你的名字，私下却准确说出了你最怕被记住的称呼。", "randomNpc", "relationship"],
  ["shared-scar", "相似的伤", "你发现{actor}身上的旧伤和自己的一模一样，对方却不肯说它们是否来自同一场战斗。", "randomNpc", "relationship"],
  ["borrowed-room", "借住一夜", "{actor}只请求在你洞府门外借住一夜，并保证不会问任何问题。", "sectMate", "relationship"],
  ["unsent-confession", "未寄出的信", "{actor}请你替他烧掉一封信，信封上的收件人却是你自己。", "randomNpc", "relationship"],
  ["old-song", "旧曲新词", "尘世旧曲从{actor}口中传来，歌词里多了一句只有你们两人经历过的往事。", "randomNpc", "relationship"],
  ["shared-birthday", "同日生辰", "{actor}发现你们在不同世界线的生辰是同一天，竟为此准备了两份礼物。", "sameRoot", "relationship"],
  ["unasked-apology", "不问缘由的歉", "{actor}向你道歉，却拒绝解释过错，只说有一天你会知道他为何如此。", "randomNpc", "relationship"],
  ["witness-for-you", "替你作证", "有人诋毁你的名声，{actor}站出来作证，却可能因此失去自己的位置。", "sectMate", "relationship"],
  ["shared-umbrella", "同伞而行", "骤雨中只剩一柄伞，{actor}把伞柄让给你，自己却走在雨里。", "randomNpc", "relationship"],
  ["name-in-diary", "札记里的名字", "{actor}无意间看见你札记的一页，发现自己早已被你写进了未来。", "randomNpc", "relationship"],
  ["returning-token", "归还信物", "{actor}归还一枚你以为早已丢失的信物，并问你是否还记得当初的承诺。", "recentOpponent", "relationship"],

  ["sealed-counter", "封口的摊位", "坊市一间摊位只在你经过时开门，{actor}说它售卖的不是物品而是选择。", "randomNpc", "market"],
  ["spirit-stone-tide", "灵石潮汐", "一批灵石在夜间自行涨落，{actor}想用它们验证一条关于财运的传言。", "randomNpc", "market"],
  ["auction-winner", "拍下的空盒", "拍卖结束后你得到一个空盒，{actor}却说真正的货物已经被你带走。", "rivalSect", "market"],
  ["merchant-identity", "商人的第二张脸", "同一个商人以两种身份向你报价，{actor}请你判断哪一个才是真正的他。", "randomNpc", "market"],
  ["old-debt-note", "旧债新价", "一张百年前的欠条被重新估价，{actor}问你是否愿意替陌生人承下这笔人情。", "randomNpc", "market"],
  ["broken-scale", "失准的灵秤", "坊市灵秤总把你的物品称轻，{actor}说这可能是某种善意，也可能是陷阱。", "sectMate", "market"],
  ["night-market-child", "夜市小客", "一个孩子在夜市卖一颗不会熄灭的糖，{actor}坚持那不是凡物。", "randomNpc", "market"],
  ["last-bid", "最后一次报价", "你和{actor}同时看中一件旧法器，摊主说最后一次报价必须用一个秘密。", "rivalSect", "market"],
  ["market-rain", "雨市换灯", "雨夜坊市只收一盏灯作为货币，{actor}却拿出了一盏已经熄灭的灯。", "randomNpc", "market"],
  ["unpriced-memory", "无价旧忆", "摊主说这段记忆不能用灵石购买，{actor}却愿意用一段自己的旧事交换。", "randomNpc", "market"],
  ["sealed-invoice", "封存的票据", "一张封存百年的票据指向你名下的货物，{actor}知道仓库的位置。", "sectMate", "market"],
  ["honest-bargain", "只讲真价", "{actor}要求你在坊市中只报一次真实价格，任何讨价还价都算失约。", "rivalSect", "market"]
];

const seasonalSeeds = [
  ["spring", "spring-swallow", "春燕衔枝", "第一只春燕把一截阵旗枝衔到{actor}窗前，像是在邀请你们重建一座旧阵。", "sectMate", "sect"],
  ["spring", "spring-rain", "春雨借伞", "春雨落下时{actor}只带来一柄旧伞，伞面写着一条尚未兑现的约定。", "randomNpc", "relationship"],
  ["spring", "spring-root", "春根初醒", "灵根在春分夜短暂改变气息，{actor}请你一起记录这次异常。", "sameRoot", "cultivation"],
  ["spring", "spring-lantern", "新灯照旧城", "{province}挂起第一盏新灯，{actor}想把它送给城中最不被看见的人。", "sectMate", "sect"],
  ["spring", "spring-market", "百花换价", "春市以一朵花决定法器价格，{actor}坚持你手中的花最适合出价。", "randomNpc", "market"],
  ["spring", "spring-duel", "花落三招", "花瓣落尽前，{actor}只愿与你切磋三招，不论胜负都要记下结果。", "recentOpponent", "duel"],
  ["spring", "spring-cave", "春洞回声", "秘境回暖后，第十洞传来幼兽叫声，{actor}希望你陪他确认它是否真实。", "dungeonPeer", "dungeon"],
  ["spring", "spring-letter", "新年旧信", "春初收到的信来自去年，{actor}问你是否愿意按信中的旧约行事。", "randomNpc", "relationship"],
  ["summer", "summer-thunder", "夏雷借火", "夏雷劈中山门却没有留下火，{actor}说雷里藏着一缕可以借用的道意。", "sameSkill", "cultivation"],
  ["summer", "summer-tide", "潮头战旗", "乱星海夏潮托起一面旧战旗，{actor}想在潮退前把它带回岸上。", "dungeonPeer", "dungeon"],
  ["summer", "summer-night", "夏夜空擂", "夏夜擂台没有观众，{actor}却点亮所有灯火等你入场。", "recentOpponent", "duel"],
  ["summer", "summer-well", "井底凉风", "宗门古井在最热的日子吹出凉风，{actor}说井底有一条不该打开的路。", "sectMate", "sect"],
  ["summer", "summer-market", "冰玉竞价", "坊市只在午时出售冰玉，{actor}请你判断它应该救谁的命。", "randomNpc", "market"],
  ["summer", "summer-oath", "蝉鸣作证", "{actor}要在蝉鸣停下前立一份誓，誓言内容却由你决定。", "rivalSect", "relationship"],
  ["summer", "summer-fire", "火树问心", "火树开花的夜晚，{actor}说每一朵花都映着一个未说出口的愿望。", "sameRoot", "cultivation"],
  ["summer", "summer-city", "城门避暑", "{province}的城门在午后只为孩子开放，{actor}请求你替守城人守住这条规矩。", "sectMate", "sect"],
  ["autumn", "autumn-leaf", "秋叶寄名", "一片秋叶写着{actor}的名字，落在你手里后却变成了另一人的姓。", "randomNpc", "relationship"],
  ["autumn", "autumn-sword", "落叶试锋", "{actor}邀请你用落叶判断剑锋，最后一片叶子落向了宗门之外。", "recentOpponent", "duel"],
  ["autumn", "autumn-harvest", "灵谷秋收", "灵谷成熟得太快，{actor}怀疑有人把未来一年的收成提前借走了。", "sectMate", "sect"],
  ["autumn", "autumn-moon", "秋月照骨", "秋月照见你与{actor}身上的旧伤，像在提醒一场尚未结束的战斗。", "recentOpponent", "relationship"],
  ["autumn", "autumn-dungeon", "枯潮秘门", "秘境枯潮退去后露出一扇门，{actor}说门上的灰来自未来。", "dungeonPeer", "dungeon"],
  ["autumn", "autumn-auction", "霜降暗拍", "霜降夜的暗拍只接受一句真话，{actor}先把自己的真话交给了你。", "rivalSect", "market"],
  ["autumn", "autumn-scripture", "收获一页经", "你在秋风里捡到一页经文，{actor}认出那是自己尚未写完的悟道笔记。", "sameSkill", "cultivation"],
  ["autumn", "autumn-bell", "晚钟三响", "宗门晚钟多响了三次，{actor}请你和他查明每一次钟声对应的名字。", "sectMate", "sect"],
  ["winter", "winter-snow", "雪中无痕", "大雪封山却留下两行脚印，{actor}说其中一行属于已经离世的人。", "randomNpc", "relationship"],
  ["winter", "winter-fire", "守炉之夜", "寒夜守炉时，{actor}把最后一块灵炭推给你，自己坐到风口。", "sectMate", "relationship"],
  ["winter", "winter-duel", "霜刃封台", "霜刃封住擂台边缘，{actor}说这次切磋只能有一个人走出寒雾。", "recentOpponent", "duel"],
  ["winter", "winter-dungeon", "冰窟回信", "冰窟深处传来回信，内容回答了你尚未问出口的一个问题。", "dungeonPeer", "dungeon"],
  ["winter", "winter-market", "岁末清账", "岁末坊市清理旧账，{actor}发现你名下竟有一笔从未借过的债。", "randomNpc", "market"],
  ["winter", "winter-city", "雪城开仓", "{province}大雪封路，{actor}主张开仓，却有人拿出一份反对的旧令。", "sectMate", "sect"],
  ["winter", "winter-root", "冬根沉眠", "所有灵根在冬至夜短暂沉眠，{actor}请你在无灵状态下与他论道。", "sameRoot", "cultivation"],
  ["winter", "winter-letter", "除夕未寄", "除夕前收到一封未寄出的信，{actor}问你愿不愿意替他把结尾写完。", "randomNpc", "relationship"]
];

const chainThemes = [
  ["sword-friend", "一剑知交", "recentOpponent", "duel", ["战后留剑", "剑意同途", "险境托背", "一剑知交"]],
  ["quiet-mentor", "无声授业", "sameSkill", "cultivation", ["一句错诀", "三日观心", "代师解惑", "无声授业"]],
  ["root-twins", "同根异命", "sameRoot", "cultivation", ["灵根共振", "命数之争", "共渡反噬", "同根异命"]],
  ["red-stage-rival", "赤台宿敌", "recentOpponent", "duel", ["赤台相逢", "胜负传言", "强敌压境", "宿敌之名"]],
  ["stolen-technique", "失传秘术", "sameSkill", "relationship", ["残页现世", "暗中追索", "真假传人", "秘术归处"]],
  ["broken-oath", "旧誓难全", "rivalSect", "relationship", ["誓书重现", "故人证词", "宗门逼问", "旧誓新解"]],
  ["city-shadow", "城下暗影", "sectMate", "sect", ["粮仓失火", "暗道踪迹", "内应名单", "城下天明"]],
  ["elder-dispute", "两峰之争", "sectMate", "sect", ["两道手令", "弟子对峙", "长老问心", "两峰定议"]],
  ["tenth-cave", "第十洞", "dungeonPeer", "dungeon", ["不存在的门", "重复的脚印", "洞中旧我", "第十洞开"]],
  ["sea-bell", "海底钟声", "dungeonPeer", "dungeon", ["潮下钟鸣", "沉船遗字", "海眼祭台", "钟声止息"]],
  ["jade-counterfeit", "玉市迷局", "randomNpc", "market", ["无瑕假玉", "三家旧账", "掌柜失踪", "玉市真相"]],
  ["border-truce", "三日停战", "rivalSect", "sect", ["界碑血书", "停战第一夜", "叛徒之箭", "第四日清晨"]],
  ["winter-lantern", "寒灯照骨", "randomNpc", "relationship", ["雪夜借火", "灯下旧名", "炉心将灭", "寒灯长明"]],
  ["river-oath", "渡河无舟", "rivalSect", "sect", ["河岸相逢", "无舟之约", "逆流传信", "彼岸同归"]],
  ["dream-market", "梦市开门", "randomNpc", "market", ["梦市入券", "摊位无主", "买下明日", "梦醒留痕"]],
  ["heart-of-storm", "风暴心证", "sameSkill", "cultivation", ["雷云初聚", "借风问术", "天门失守", "风止见心"]]
];

function rarityFor(index, chain = false) {
  if (chain) return index % 4 === 0 ? "rare" : "uncommon";
  if (index % 19 === 0) return "fated";
  if (index % 7 === 0) return "rare";
  if (index % 3 === 0) return "uncommon";
  return "common";
}

function choiceEffects(category, index, choiceIndex) {
  const drift = (index % 3) + 1;
  if (choiceIndex === 0) {
    return {
      affinity: category === "duel" ? 0 : 2 + drift,
      respect: 3 + drift,
      spirit: category === "market" ? -(4 + drift) : 0,
      dust: category === "dungeon" && index % 4 === 0 ? 1 : 0,
      battle: category === "duel" && index % 2 === 0,
      invite: category === "relationship" && index % 4 === 0
    };
  }
  if (choiceIndex === 1) {
    return {
      affinity: 3 + drift,
      respect: 1 + drift,
      spirit: category === "market" && index % 2 === 0 ? 3 + drift : 0,
      dust: category === "cultivation" && index % 5 === 0 ? 1 : 0
    };
  }
  return { affinity: index % 5 === 0 ? 1 : 0, respect: 1, spirit: 0, dust: 0 };
}

function outcomeText(category, choiceIndex) {
  const profile = categoryProfiles[category];
  if (choiceIndex === 0) return `你选择亲自面对此事，${profile.label}因此留下了新的转折。`;
  if (choiceIndex === 1) return "你们没有急着分出对错，彼此的看法却比从前清晰。";
  return "你依照本心作出取舍，此事暂且记入札记。";
}

function buildChoices(definitionId, category, index, chain = null) {
  const profile = categoryProfiles[category];
  return profile.choices.map(([label, hint, tone], choiceIndex) => ({
    id: `${definitionId}-choice-${choiceIndex + 1}`,
    label,
    hint,
    tone,
    outcome: outcomeText(category, choiceIndex),
    memoryTag: `${category}-${choiceIndex === 0 ? "intervene" : choiceIndex === 1 ? "mediate" : "observe"}`,
    deferred: choiceIndex === 0 && (index % 4 === 0 || Boolean(chain))
      ? { kind: category, days: 2 + ((index + choiceIndex) % 4) }
      : null,
    effects: {
      ...choiceEffects(category, index, choiceIndex),
      ...(chain && choiceIndex < 2 && chain.nextId ? { nextEventId: chain.nextId, nextDelay: 1 + ((index + choiceIndex) % 3) } : {}),
      ...(chain && choiceIndex === 2 && chain.nextId ? { endChain: true } : {}),
      ...(chain && !chain.nextId ? { completeChain: true } : {})
    }
  }));
}

const seasonalNames = new Set(["spring", "summer", "autumn", "winter"]);
const allStandaloneSeeds = [
  ...standaloneSeeds.map(([slug, title, text, actorRule, category]) => ({ slug, title, text, actorRule, category, season: "all" })),
  ...expansionSeeds.map(([slug, title, text, actorRule, category]) => ({ slug, title, text, actorRule, category, season: "all" })),
  ...seasonalSeeds.map(([season, slug, title, text, actorRule, category]) => ({ season, slug, title, text, actorRule, category, seasonal: true }))
];

const standaloneDefinitions = allStandaloneSeeds.map(({ slug, title, text, actorRule, category, season, seasonal }, index) => {
  const id = `encounter-${slug}`;
  const rarity = rarityFor(index);
  return {
    id,
    title,
    text,
    actorRule,
    category,
    categoryLabel: categoryProfiles[category].label,
    rarity,
    weight: rarity === "common" ? 10 : rarity === "uncommon" ? 6 : rarity === "rare" ? 3 : 1,
    familyId: `${category}-${slug.split("-")[0]}`,
    season: seasonal && seasonalNames.has(season) ? season : "all",
    cooldownDays: rarity === "fated" ? 99999 : seasonal ? 360 : 90,
    oncePerSave: rarity === "fated",
    oncePerCycle: Boolean(seasonal),
    seasonal: Boolean(seasonal),
    choices: buildChoices(id, category, index)
  };
});

const chainDefinitions = chainThemes.flatMap(([chainId, chainTitle, actorRule, category, stages], chainIndex) => (
  stages.map((stageTitle, stageIndex) => {
    const id = `encounter-chain-${chainId}-${stageIndex + 1}`;
    const nextId = stageIndex < stages.length - 1 ? `encounter-chain-${chainId}-${stageIndex + 2}` : "";
    const stageText = [
      `{actor}带来「${chainTitle}」的开端，这件事显然不会在今日结束。`,
      `关于「${chainTitle}」的线索再次出现，{actor}的态度已经与最初不同。`,
      `事情走到最难回头的一步，{actor}把最后的决定交到你手中。`,
      `持续多日的「${chainTitle}」终于迎来结局，{actor}在天明前等你的答复。`
    ][stageIndex];
    return {
      id,
      title: `${chainTitle}·${stageTitle}`,
      text: stageText,
      actorRule,
      category,
      categoryLabel: categoryProfiles[category].label,
      rarity: rarityFor(chainIndex, true),
      weight: stageIndex === 0 ? 3 : 0,
      cooldownDays: 99999,
      oncePerSave: stageIndex === 0,
      familyId: `chain-${chainId}`,
      season: "all",
      chainId,
      chainTitle,
      chainStep: stageIndex + 1,
      chainLength: stages.length,
      eligibleAsStart: stageIndex === 0,
      choices: buildChoices(id, category, standaloneDefinitions.length + chainIndex * 4 + stageIndex, { nextId })
    };
  })
));

export const encounterDefinitions = [...standaloneDefinitions, ...chainDefinitions];
export const encounterDefinitionMap = Object.fromEntries(encounterDefinitions.map((definition) => [definition.id, definition]));
export const encounterDefinitionCount = encounterDefinitions.length;
export const encounterCategoryLabels = Object.fromEntries(Object.entries(categoryProfiles).map(([id, profile]) => [id, profile.label]));

if (encounterDefinitionCount !== 240) {
  throw new Error(`因缘事件定义数量异常：期望 240，实际 ${encounterDefinitionCount}`);
}
