import { personalHistory } from './resident-stories.js';
import { workConversation } from './workday.js';

// Original game dialogue, not transcribed television lines. Answers stay within
// each resident's knowledge and the opening-era setting.
//
// What was here before gave every person in the silo the same five questions —
// what do you do, where should I look, why is everyone watching, tell me about
// yourself, what keeps you going — and one or two lines behind each. Twenty
// different people answered the same interview. This is a conversation instead:
//
//   * every named resident has their own questions, written out of their own
//     life, so the list itself tells you who you are standing in front of;
//   * a question can open into follow-ups that only exist once you have asked
//     it, so a conversation goes somewhere rather than ending five times;
//   * they know each other. Ask Shirley about Juliette and you get Shirley's
//     opinion of her, not a line about Mechanical;
//   * the people with no name get composed rather than templated, so the
//     hundredth porter is a different person from the first.
//
// `replies` is the repeat-ask cycle ConversationMemory walks, so pressing the
// same question twice is never the same answer twice.

// [label, reply, ...[followLabel, followReply]]
const t=(label,reply,...follow)=>({id:slug(label),label,reply,
  follow:follow.map(([l,r,...more])=>({id:slug(l),label:l,reply:r,replies:more.length?[r,...more]:undefined}))});
const slug=s=>String(s).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,40);
// The composed residents keep stable, meaningful ids rather than slugs of their
// own wording: the memory is keyed on them, and rephrasing a question should
// not silently forget that the player already asked it.
const tid=(id,label,reply,...follow)=>({...t(label,reply,...follow),id});

// --- the people you can put a name to ------------------------------------
const CAST={
  juliette:{greeting:'Mind where you put your hands, half of this is hot. What do you need?',topics:[
    t('What are you working on?','The generator has been running warm since before the last shift change. Everyone upstairs thinks heat is a Mechanical problem. Heat is everyone’s problem. We just get to stand next to it.',
      ['Can it be fixed?','Everything can be fixed. The question is whether they let me shut it down long enough to do it properly, or whether I patch it again and we all agree not to talk about it.'],
      ['Who taught you the work?','Walker, mostly. My father taught me the names of bones. Walker taught me the name of everything else, and he never once made me feel stupid for asking twice.']),
    t('Did you know George Wilkins?','He repaired computers, and he asked his questions in the wrong order. That is what the report says, in more words. He could make a thrown-away thing feel important.',
      ['What happened to him?','He fell. That is the word on the paperwork, and I have read that paperwork more times than is good for me. A man who could strip a board in the dark does not simply fall.'],
      ['What did he show you?','Nothing I can hand you. Only the shape of a question big enough to be worth somebody’s trouble. I have been carrying the shape around ever since.']),
    t('You are Doctor Nichols’s daughter.','I am. He went up, I came down, and neither of us has managed the stairs since. It is a long way to walk to admit you were both right about different things.',
      ['Do you see him?','Not often enough to be comfortable and not rarely enough to stop counting. He sends word when someone from down here comes up hurt. That is his way of asking after me.'],
      ['Would you go up?','For the right reason. Not to sit in an office and be told which repairs I am allowed to make.']),
    t('About Holston.','I met him twice. He struck me as a man who checked things properly. Whatever took him out there, it was not a mood. He will have thought about it the way I think about a seal.',
      ['Why would anyone go out?','Because they decided the answer was worth more than the rest of it. I am not going to pretend I cannot follow the reasoning. That is the part people upstairs would rather I did not say out loud.'],
      ['Does it frighten you?','What frightens me is how quickly everybody went back to work.'])]},

  walker:{greeting:'Do not touch the bench. Everything on it is in an order, whatever it looks like.',topics:[
    t('What is on the bench?','A radio, three boards that will not talk to each other, and somebody’s lamp. People bring me the broken thing rather than the new thing. That tells you something about this floor.',
      ['Why radios?','A little box lets you hear a familiar voice without leaving your room. I have made my peace with rooms. Other people have not, and they should not have to.'],
      ['Do you ever leave the workshop?','Not for a long while now. The work comes to me and so do the people. A door is only a problem if you want to be on the other side of it.']),
    t('You taught Juliette.','I gave her a bench and got out of the way. She had the hands already. What she needed was somebody who would not laugh when she asked what a thing was actually for.',
      ['How is she doing?','She is going to take something apart one day that people would rather she left alone. I have known that since she was small and I have never once tried to talk her out of it.'],
      ['Does she still visit?','She comes down when something rattles. Sometimes there is nothing wrong with the part she brings. I do not point that out.']),
    t('What do you make of Supply?','Carla knows what a useful part is worth, which is why we have had so many arguments about it. She is right more often than I admit to her face.',
      ['Do you get what you ask for?','I get what I can justify. That is not the same thing, and a justification takes longer to write than the repair takes to do.'],
      ['What do you keep back?','Everything worth keeping. That is not a confession, it is inventory management.']),
    t('About the cleaning.','I did not watch. I have seen the hill. It does not change because somebody wipes the glass, and I had a lamp to finish.',
      ['You did not go up at all?','I have not been up in years. That is not grief, it is preference, and people keep wanting to make it the other thing.'],
      ['Does it not trouble you?','It troubles me plenty. Troubling me and getting me up those stairs are two different projects.'])]},

  knox:{greeting:'Keep the lane clear, we are carrying. Say what you need.',topics:[
    t('What does Mechanical do?','We keep the generator steady — heat, power, pumps. Nobody thinks about us until something stops, and then everyone thinks about us at once.',
      ['How many under you?','Enough that I answer for people working below the last numbered landing. A repair missed upstairs reaches us eventually, usually at the worst hour.'],
      ['What worries you?','The margin. We used to have one. Now every fix is a decision about which other thing waits.']),
    t('What is Shirley like to work with?','She will tell you when something is wrong. That is a useful quality in a place full of people who have learned to keep quiet.',
      ['And Juliette?','She is the best hand I have and the most trouble I have, and those are the same fact. You do not get one without the other.'],
      ['Do you back them?','Down here you back your people or you get nothing carried. Upstairs they call that a faction. Let them.']),
    t('Do the upper levels listen?','They listen when the lights flicker. Between flickers we are a line on a requisition. I have stopped being surprised and I have not stopped writing them.',
      ['Has that always been so?','Jahns comes down and walks it herself, which is more than the last three did. Whether walking it changes anything is a different question.'],
      ['What would you ask for?','Time. Not parts. Time with the machine shut down and nobody standing over me asking when the lights come back.']),
    t('About the cleaning.','We heard about it on the floor. Nobody stopped for long. That is not coldness — a generator does not pause because a man walked out of a door two hundred metres up.',
      ['Did it reach down here at all?','It reached. You could tell by how careful everyone was being with each other for a day or so.'],
      ['Did you know him?','By name and by reputation. He was straight with us the once we had cause to deal with him. That counts for more than you would think.'])]},

  shirley:{greeting:'Hold on — right, that will hold for now. What is it?',topics:[
    t('What are you fixing?','Another seal. There is always another seal. You learn quickly which rattles are harmless and which ones are going to cost somebody a shift.',
      ['How do you tell?','By how the sound sits under the others. A bad one is not louder, it is wronger. I could not write that down for you in a way that would help.'],
      ['Do you like it down here?','I like knowing what everything in the room is for. Try that upstairs.']),
    t('Tell me about Juliette.','She belongs down here, whatever anyone upstairs decides later. We have spent too many shifts keeping one another out of trouble for me to pretend otherwise.',
      ['Trouble of what kind?','The kind where you ask a question in front of the wrong person. She has never once learned to wait until the room empties.'],
      ['Is she all right?','She has been quiet since George. Quiet on her is not restful. It means she is working on something.']),
    t('How do you read people?','By watching them work. Who checks a fitting twice. Who leaves you the good wrench instead of the one with the rounded jaw. It is never what they say in the corridor.',
      ['Has that ever been wrong?','Twice. Both times I had decided about somebody before I had watched them do anything.'],
      ['What do I look like, then?','Somebody asking a lot of questions on somebody else’s floor. That is not an accusation. It is just what it looks like.']),
    t('About the cleaning.','We had it on down here for a bit. Then Knox turned it off, and he was right to. Watching does not help him and it does not help us.',
      ['Do you want to know why he went?','Everyone wants to know. Wanting to know and being allowed to ask are different floors of the same building.'],
      ['Does anyone talk about it?','Not where it can be overheard. That itself tells you something.'])]},

  jahns:{greeting:'A moment, then — I have four landings still to walk today.',topics:[
    t('Why walk the silo yourself?','Because a report written upstairs rarely contains the thing that is actually wrong. People will tell you on their own landing what they would never put on a form.',
      ['Does it change anything?','Sometimes. It changes what I know, which is the only part I can promise. The rest is argument.'],
      ['Is it not a long way down?','It is. My knees have opinions I did not ask for. I would rather arrive slowly than send somebody else.']),
    t('What do the lower levels tell you?','That every landing believes the floors above it have stopped listening. They are not entirely wrong, and the ones who say it plainest are usually the ones doing the most work.',
      ['Do you agree with them?','I agree that we ask a great deal of Mechanical and thank them mostly in writing.'],
      ['What would you change?','I would make the people who sign the requisitions walk down and hand them over.']),
    t('You travel with Marnes.','For a great many years. He has a practical answer to almost everything, and on a long day that is worth more than a clever one.',
      ['Is he good at the work?','He notices. That is most of the job. The rest is paperwork and standing still while people shout.'],
      ['Only the work?','That is a very direct question for a gallery. Walk on with me and ask me again on the stairs.']),
    t('About the cleaning.','A cleaning leaves a silence behind it. People need time, and mostly what they are given is a shift starting.',
      ['Did you know Holston?','I appointed him. I have signed a great many pieces of paper and that is one of the few I would sign again.'],
      ['Did you expect it?','No. And I have gone back over the last months of it wondering which afternoon I should have.'])]},

  marnes:{greeting:'Deputy. If it is a dispute, start at the beginning and leave the adjectives out.',topics:[
    t('What does the job amount to?','Disputes, paperwork, and keeping people out of trouble they have not quite got into yet. The last part is most of it and none of it gets written down.',
      ['Is it ever more than that?','Rarely, and I have never once been glad when it was.'],
      ['Where is the station?','Beside this cafeteria. The preparation rooms are further through, and you do not want to be in those.']),
    t('You worked with Holston.','For years. After enough shifts together you stop needing to explain a look. That is the part I have not got used to being without.',
      ['Did you see it coming?','I have asked myself that on every landing between here and Mechanical. I keep arriving at the same unsatisfying place.'],
      ['What was he like?','Careful. Straight. He read a room before he spoke into it. None of that is an explanation and I am tired of being asked for one.']),
    t('You travel with the Mayor.','Jahns listens before she decides. I have watched what that costs her in stairs and I have never heard her complain about it where anyone could hear.',
      ['That is a long way to walk together.','It is. We have covered it a good many times and I have not run out of things to not say yet.'],
      ['Does she take your advice?','She takes it, considers it, and does the harder thing. Which is usually right, and always more walking.']),
    t('About the cleaning.','He went out and he cleaned and he walked over the hill. The rest of it is people talking in a cafeteria. I would rather not add to it.',
      ['People are going to talk.','They are. I would just rather it was not me doing it in a room he used to eat in.'],
      ['Is there an investigation?','There is procedure. Procedure is what we have instead of an answer.'])]},

  billings:{greeting:'Deputy Billings. Say it plainly and I will do the same.',topics:[
    t('You came from Judicial.','I learned procedure there. Following it and understanding it are two different pieces of work, and only one of them is taught.',
      ['Why the sheriff’s office?','Because procedure in Judicial happens to a person from a long way off. Here it happens in front of you, and you have to keep your face.'],
      ['Do you miss it?','I miss knowing the rules I was working to. Down here you find out what the rule was afterwards.']),
    t('What do you make of the Pact?','It holds ten thousand people in a tube in the ground and mostly they eat and sleep and argue about nothing. I would not throw that away for a clever objection.',
      ['And the parts that are wrong?','I did not say there were none. I said I would not throw the rest away. Those are different positions and people keep collapsing them.'],
      ['Who decides which is which?','Judicial. Which is a real answer and not a satisfying one, and I notice that every time I give it.']),
    t('Tell me about your family.','Kathleen and our child are the reason I go home rather than stay late. I try to remember that everyone I question has somebody waiting too.',
      ['Does that make it harder?','It makes it slower. Slower is usually better in this job, whatever the paperwork prefers.'],
      ['Do you talk about work at home?','No. That is not secrecy. It is that I would like one room where I am not deciding about somebody.']),
    t('About the cleaning.','I would rather speak about what we know than add another rumour. What we know is short and everyone has already heard it.',
      ['What do you think happened?','I think a man made a decision nobody was allowed to discuss with him. That is as far as I will go standing in a gallery.'],
      ['Is that not the job?','The job is what I can act on. What I think is my own business until it becomes evidence.'])]},

  lukas:{greeting:'Sorry — I was counting. Give me a second and it is gone. What can I do?',topics:[
    t('What are you counting?','Lights. After a shift I sit up here and mark down where they are. Nobody asked me to. That is the part I like about it.',
      ['Do they move?','Some do. Slowly, and only if you have last week’s page to set beside this one. A single night tells you nothing, which is why most people stop after one.'],
      ['What do you think they are?','I have four answers and no way to choose between them. I would rather have four than settle early on a comfortable one.']),
    t('You work in IT.','Systems and records. Mostly I keep things from breaking in ways that would take a week to explain. It is quieter than people assume.',
      ['Do you like it?','I like the systems. I am less sure about the floor they are on. There is a way people stop talking when you come round a corner up there.'],
      ['What does Bernard make of your drawings?','He knows about them. He has never told me to stop, and he has never asked to see one. I have thought about that more than I should.']),
    t('Why keep the drawings?','Because a pattern means more when you noticed it yourself. I kept them from before I had any explanation, and I am glad I did.',
      ['Could you show me?','Not here. They are not secret. They are just easier to explain sitting down with the pages in order.'],
      ['Does anyone else watch?','Not that I have found. People come up here to eat and look at the hill, not up.']),
    t('About the cleaning.','I watched from the back. I keep thinking about the wiping, not the walking. He was thorough. Somebody who had stopped caring would not have been.',
      ['What do you mean?','He did the whole lens. Every part of it, in order. That is a man finishing a job, not a man giving up.'],
      ['Have you told anyone that?','I am telling you. In a cafeteria. Which is probably answer enough about who else I have told.'])]},

  bernard:{greeting:'Yes. Briefly — I have a department waiting on me.',topics:[
    t('What does IT actually do?','We protect the systems that keep this place functioning. Records, terminals, the network, the screens. Most people only think of us when something has failed.',
      ['Is that frustrating?','It is the job working correctly. I prefer the days when nobody has cause to think about us at all.'],
      ['Who works for you?','Good people, mostly young, mostly certain. Kyle is the best of them and I would rather you did not repeat that to him.']),
    t('Why does the screen matter so much?','Because it is the one thing everybody sees with their own eyes. People will accept a great deal from a report. They will not accept it from a picture that does not match.',
      ['Then it must be kept clean.','It must be kept working. Clean is a consequence.'],
      ['And when it is dirty?','Then people stop trusting the picture, and after the picture they stop trusting everything behind it. That is not a technical problem.']),
    t('What is the Order?','A body of instructions for those entrusted with it. Not a secret so much as a responsibility that does not end when a shift does.',
      ['Entrusted by whom?','By the people who came before and by the Pact they left. That is not evasion. It is the whole of the answer I am able to give.'],
      ['That is not much of an answer.','No. It is the accurate one, which I have found is usually the less satisfying of the two.']),
    t('About the cleaning.','A sheriff asked to go outside and the Pact was followed. I know how that sounds said flatly. It is also exactly what occurred.',
      ['Did you speak to him?','Briefly. I am not going to relay a private conversation to a stranger in a cafeteria, and you would think less of me if I did.'],
      ['Why do they always clean?','They are handed a rag and a reason. What they do with it out there has surprised people before.'])]},

  sims:{greeting:'Judicial. Keep it short and keep it in the open.',topics:[
    t('What does Judicial do?','We keep order. Most people get to live an ordinary life because somebody is doing this work, and most of them never have to know our names.',
      ['That sounds like a lot of power.','It sounds like a lot of paperwork, which is what it mostly is. The rest is standing in doorways people would rather you were not standing in.'],
      ['Where may I go?','Public galleries are open. Restricted offices are not, and the difference is marked. I would keep to the marks.']),
    t('Tell me about your family.','Camille and our son. You cannot separate what I do from wanting them somewhere safe, and I have stopped trying to pretend otherwise.',
      ['Does the work follow you home?','You learn to notice who goes quiet when a door opens. That does not switch off at your own door. Camille noticed it in me before I did.'],
      ['What do you want for him?','A silo that still works when he is my age. I am aware that is a larger answer than the question wanted.']),
    t('What does a raid involve?','A door, a list, and people who would rather we were not there. It is not the dramatic thing the galleries imagine. It is careful and it is slow.',
      ['Does it trouble you?','The ones where we find nothing trouble me. You have turned over a family’s rooms and the only thing you have proved is that you could.'],
      ['Who decides?','Judicial signs it. I execute it. Those being different people is deliberate and I would not want it any other way.']),
    t('About the cleaning.','It is over. Let the family have what privacy is left to them — there is not much, in a place this size.',
      ['People will talk anyway.','They will. I am asking you not to be the one doing it on his own floor.'],
      ['Were you involved?','Judicial is involved in every cleaning. That is a matter of record and not a matter of gossip.'])]},

  camille:{greeting:'Yes? Speak up, it is loud in here at this hour.',topics:[
    t('What do you do now?','I look after my family and I pay attention. You would be surprised how much of a floor you can read from a doorway if you are not in a hurry.',
      ['You were a raider.','I was. It teaches you to see a room in pieces — what is out of place, what has been moved recently. You do not stop seeing it afterwards.'],
      ['Do you miss it?','I miss being certain. The work made you certain, and certainty is a comfortable place to live.']),
    t('Tell me about Robert.','He carries it home whether or not he means to. I have learned the difference between a bad shift and a bad case by how long he stands in the doorway.',
      ['Do you discuss his work?','Not the details. The weather of it, if you like. That is usually enough for both of us.'],
      ['Does he listen to you?','More than his colleagues would guess. Less than he should, on the days it matters.']),
    t('What is worth watching for?','What people leave unsaid. A gallery is full of conversations that stop when you come near, and almost all of them are innocent. Almost.',
      ['And the ones that are not?','Those you leave alone and remember. Acting early is how you turn a rumour into a raid and a neighbour into an enemy.'],
      ['Am I being watched?','You are being noticed. That is not the same and you should not flatter yourself into thinking it is.']),
    t('About the cleaning.','There are people in this room who knew him. Listen before you ask them anything, and do not ask at all if you only want the story.',
      ['That is fair.','It is the only thing I would want asked of somebody standing near me.'],
      ['Did you watch?','I watched the room, mostly. You learn more from the faces than from the hill.'])]},

  meadows:{greeting:'Yes. I have a few moments and no more than that.',topics:[
    t('What does the Judge do?','Judicial settles disputes and administers the Pact. The weight of it is not visible from a gallery, which is probably as it should be.',
      ['Is it a lonely office?','A title makes people mistake your silence for certainty. After enough years you stop correcting them, and that is its own kind of alone.'],
      ['Do you sit every day?','I sign more than I sit. Most of the Pact is administered with a pen by somebody who never meets the people concerned.']),
    t('Is the Pact ever wrong?','The Pact is what we have instead of the alternative, and I have read what the alternative looked like. That is not the same as calling it perfect.',
      ['You have read the old records?','Some. Enough to be careful about wishing for a cleaner world than the one that produced this one.'],
      ['Would you change it?','I would change how quickly we reach for it. Not the document. The habit.']),
    t('What is in your office?','Things that tell you more than the official records do. Some of them are best left exactly where they are, which is a sentence I am aware invites the opposite.',
      ['Such as?','I am not going to itemise it for a stranger. I said it to make a point about records, not to issue an invitation.'],
      ['May I see it?','No. But you may have the point: a room remembers what a file omits.']),
    t('About the cleaning.','A screen can show you an event without explaining a person. Everyone in this cafeteria watched the same picture and each has a different man in mind.',
      ['Which one is right?','None of them, entirely. That is true of everybody, not only the ones who go outside.'],
      ['Did the Pact require it?','The Pact provided for it. Required is a stronger word and I choose my words carefully in public.'])]},

  carla:{greeting:'Supply. If you are after a part, tell me what it is for, not what it is called.',topics:[
    t('How does Supply work?','We find the parts and Mechanical reminds us how urgently they need them. The paperwork suggests we are separate departments. The work suggests otherwise.',
      ['Why ask what it is for?','Because half the time the thing they name is not the thing they need. Ask what it is for and you can often solve it from the shelf.'],
      ['Is anything running short?','Everything is running short. That has been true my whole working life and it is more true now than it was.']),
    t('What do you make of Walker?','He sees a circuit where the rest of us see scrap. I have learned to put certain things aside for him rather than send them down the chute.',
      ['He said you argue.','We do. About value, mostly, which is a more interesting argument than it sounds. He is right about the parts and I am right about the ledger.'],
      ['Does he ever come up?','Never. I have stopped expecting it and I have not stopped leaving things by.']),
    t('What happens to what you cannot use?','Recycling, and then it comes back to us as something else. Nothing in here really leaves. That is either reassuring or not, depending on the day.',
      ['Does anything get lost?','Things get kept. There is a difference, and most of it happens in the bazaar.'],
      ['Do you mind?','I mind the ones that matter. A person keeping a thing they love is not my problem. A person keeping a pump seal is.']),
    t('About the cleaning.','People still need their meals and their shifts and their deliveries. That sounds cold. It is the thing that carries a floor through a bad week.',
      ['Did it slow you down?','For a morning. Then the requisitions came in as usual, which I take as everyone else deciding the same thing.'],
      ['Did you know him?','To nod to. He signed for things properly, which is more than I can say for some offices.'])]},

  patrick:{greeting:'Come in, come in — mind the crate. Everything here works, or nearly.',topics:[
    t('What do you sell?','Repairs, mostly. Exchanges. Very little down here is too old to be useful, and the things people bring me are rarely the things they talk about.',
      ['What do they bring?','Whatever broke. And sometimes, quietly, whatever they found. I do not ask the second question and they do not volunteer it.'],
      ['Is that allowed?','It is allowed until somebody decides it is not. That is true of most of the bazaar and everybody here knows it.']),
    t('What is a relic worth?','Whatever the person holding it has decided. Something can be worthless on an inventory and irreplaceable to its owner, and my job is knowing which one I am looking at.',
      ['Give me an example.','A child’s toy with the paint gone. Nothing. Except to the one who had it first, and then there is no number at all.'],
      ['Do you keep any?','One or two. I am not going to show you in the middle of a gallery.']),
    t('Where should I look in the bazaar?','Down the side aisles. The front counters are for people who already know what they want. The side aisles are for everybody else.',
      ['What is down there?','Smaller tables, older stock, and traders who will talk to you if the aisle is quiet.'],
      ['Anything I should avoid?','Asking loudly. Questions travel faster than people do here, and they arrive before you.']),
    t('About the cleaning.','Trade went quiet for a day. Then it did not. I am not proud of how quickly, but there it is.',
      ['Did people talk?','In here they talk about everything. That is what a bazaar is for, and it is also why I am careful about what I say back.'],
      ['Do you have an opinion?','I have several, all of them for after hours.'])]},

  pete:{greeting:'Yes? If it is medical, sit down first and tell me second.',topics:[
    t('What does Medical handle?','Everything from a crushed finger to the last hour of a long life. There is more to looking after somebody than what fits on a chart.',
      ['Are you short of anything?','We stretch every clean sheet and every working instrument. You learn to be inventive and you learn to hate being inventive.'],
      ['Where is Medical?','Level sixty-two. Ask at the desk before you go into a treatment room — there is usually a reason the door is closed.']),
    t('Juliette is your daughter.','She is. Being able to treat a patient teaches you nothing at all about speaking to your own child, and I have had a long time to prove that.',
      ['When did you last speak?','Longer ago than I would tell her. She writes when someone comes up hurt from Mechanical. I read more into those notes than is in them.'],
      ['Why did she go down?','Because I did not go with her. That is the short answer and I have had years to find a better one.']),
    t('What do charts leave out?','Nearly everything that matters. A lifetime of looking at them has mostly taught me how much is happening in the room that the page will never hold.',
      ['Such as?','Who came with them. Who did not. Whether they are frightened of the treatment or of going home afterwards.'],
      ['Do you write it down?','No. There is no column for it, and I am not sure I would want there to be.']),
    t('About the cleaning.','I would rather not discuss another family’s grief in a corridor. Ask me sitting down in Medical and you will get a different answer.',
      ['Understood.','Thank you. Most people press.'],
      ['Did you treat him?','I have treated most people in this silo at one time or another. That is not the same as knowing what was in his head.'])]},

  gloria:{greeting:'Sit down a moment. Everyone in here seems to be on their way somewhere.',topics:[
    t('What was your work?','I helped families. Counselling, mostly, and the paperwork that goes with deciding who may and who may not. People assume I have nothing left to remember.',
      ['Do you?','I remember families before they became entries in a record. That is the part of this work everyone forgets is a part of it.'],
      ['Do they still ask you?','Occasionally somebody knocks. Usually somebody old enough to remember that I was the one who knocked first.']),
    t('What do you remember?','Names, mostly, and which room they were in. Rooms change hands faster than names do. It is a strange way to keep a history but it is the one I have.',
      ['Anything you would rather forget?','Several. Forgetting has not been on offer.'],
      ['Does anyone write it down?','No. That is what I mind most — not the forgetting, the not writing.']),
    t('You said someone trusted you with a question.','A long time ago, yes. I never had an answer for it. I have thought since that remembering the question was the part that mattered.',
      ['What was it?','Not in a cafeteria. Perhaps not at all. I am old enough to be allowed one thing I keep.'],
      ['Who asked it?','Somebody who is not here to be asked again. That is most of my acquaintances now.']),
    t('About the cleaning.','Remember the people, not only the way they left. That is the whole of what I have to offer and it takes a lifetime to mean it.',
      ['Did you know them?','I knew her. Allison. She came to see me once, and she was better company than most of the people who did.'],
      ['What was she like?','Quick. Impatient with comfortable answers. That is not an explanation and I am not offering one.'])]},

  hank:{greeting:'Deputy down here. Most trouble finds me before a report does.',topics:[
    t('What is it like being deputy this far down?','Everybody knows everybody, so half the job is knowing whose cousin I am about to upset. It is less paperwork and more standing in kitchens.',
      ['Is there much trouble?','Less than upstairs imagines. People who work a shift together do not have the energy left to feud properly.'],
      ['Do you like it?','I would not swap. Up top you police strangers. Down here you police neighbours, which is harder and better.']),
    t('How do I find my way down here?','Follow the floor numbers and keep to the lower galleries; they run into Mechanical. If you lose the numbers, ask anyone — they all know.',
      ['Anywhere I should not go?','Past the work lanes when a shift is moving. Not because it is forbidden. Because you will be in the way and they will tell you so.'],
      ['Is it far?','It is always far. That is the silo’s one joke and it makes it every day.']),
    t('Do the upper levels come down?','The mayor does. Deputies from up top, rarely, and you can tell because they take the handrail on the outside.',
      ['Does that cause friction?','It causes comment. Friction would be putting it too strongly, most weeks.'],
      ['What do people say?','That the floors above stopped listening. I hear it enough that I have stopped arguing with it.']),
    t('About the cleaning.','We heard. It feels far away until you see everybody looking at the same screen at the same moment, and then it does not.',
      ['Did work stop?','For as long as it took. Then somebody said the pumps do not care and everyone went back, which is how it goes.'],
      ['Did you know him?','Not to speak to. I knew his name on paperwork, which is a thin way to know anybody.'])]},

  cooper:{greeting:'Oh — hello. Sorry, I am meant to be fetching something.',topics:[
    t('What are you learning?','The machinery, slowly. Knowing the name of a part turns out to be far easier than getting it back where it came from.',
      ['Who is teaching you?','Whoever has a spare hand. Teddy mostly, and Shirley when she has the patience, which is more often than she lets on.'],
      ['Is it going well?','I have stopped being asked to hold things and started being asked to fetch things. Apparently that is progress.']),
    t('What is the hardest part?','Admitting I do not know. Everyone down here says to ask, and then you ask, and you can hear yourself being new.',
      ['Do they mind?','No. That is the strange bit. I mind, and nobody else does.'],
      ['Will you stay?','I think so. Nobody up top ever showed me what anything was for.']),
    t('Where should I start?','The walkways in Mechanical. Ask before you touch a control, even one that looks dead. Especially one that looks dead.',
      ['Why especially?','Because that is the one I touched.'],
      ['What happened?','Nothing dramatic. It is just that everybody still knows about it.']),
    t('About the cleaning.','I did not know them. I saw how quiet everyone went, and that told me more than the screen did.',
      ['Quiet how?','People carried on working but nobody talked over the machines. You notice the talking when it stops.'],
      ['Did you watch?','A bit. Then I felt like I was intruding and went back down.'])]},

  teddy:{greeting:'Aye? If it rattles, leaks or needs carrying, that is me.',topics:[
    t('What is your work?','Whatever the floor needs. I am not the one who diagnoses it, I am the one who gets it there and holds it steady while somebody cleverer swears at it.',
      ['Is that not thankless?','Nothing is thankless when the person holding the other end is Shirley. She says thank you every single time and I have never told her I noticed.'],
      ['Do you want more than that?','I want a bad back later rather than sooner. Past that I am not ambitious and it has suited me.']),
    t('Where are the work areas?','Below the last numbered level. Keep to the marked platforms — the marks are not decoration, they are where the floor is.',
      ['Is it dangerous?','It is dangerous if you wander. It is perfectly safe if you do what the person who works there tells you.'],
      ['Have you seen accidents?','Some. Every one of them started with somebody being somewhere they had not said they were going.']),
    t('How is Cooper getting on?','Better than he thinks. He apologises for asking, which is the only bad habit he has picked up down here.',
      ['Where did he get that?','Upstairs, I expect. They teach you that not knowing is a failing. Down here it is just Tuesday.'],
      ['Will he last?','He will. He is the sort who stays late to see how it finished.']),
    t('About the cleaning.','Nobody down here stopped working for long. That does not mean nobody cared, and I have got tired of explaining the difference.',
      ['Who asks you to explain it?','People from up top, mostly, who came down that week and were surprised the lights were still on.'],
      ['Did you care?','I thought about him all shift. I also fitted a pump. Both are true.'])]},

  amundsen:{greeting:'Keep the passage clear. What do you want?',topics:[
    t('What is your role?','Judicial security. If the passages stay clear and nobody is where they have not said they will be, we will have no reason to speak again.',
      ['That sounds like a warning.','It sounds like the job. You have decided which one it is, which is interesting.'],
      ['Where may I go?','The directory lists the public areas. A locked room is locked for a reason and the reason is not your business.']),
    t('What do you actually do?','I go where I am sent and I come back with what I was sent for. The part in the middle is not gallery conversation.',
      ['Does it trouble you?','It is a task. Attaching feeling to a task is how people make mistakes in a doorway.'],
      ['Have you ever refused?','No. And I have noticed you are the third person to ask me that this season.']),
    t('Do people fear Judicial?','Some. Mostly the ones with a reason. The rest get on with their lives and never learn my name, which is the arrangement working.',
      ['And the ones without a reason?','They are inconvenienced and then they are left alone. I am aware that is not much comfort.'],
      ['Is that fair?','Fair is Judicial’s department. Mine is narrower.']),
    t('About the cleaning.','There is nothing to be gained from spreading guesses. I have seen what a guess does to a floor by the time it reaches the bottom.',
      ['You were there?','Judicial attends. That is on the record and the rest is not.'],
      ['That is not an answer.','No. It is the end of one, though.'])]},

  george:{greeting:'Keep your voice down. Sit, if you are staying.',topics:[
    t('What do you repair?','Computers, officially. Anything with a board in it, actually. People bring me the thing nobody upstairs would sign a requisition for.',
      ['Does that get you in trouble?','It gets me noticed. Those are the same thing here with a delay in between.'],
      ['Who brings you work?','Half of Mechanical, and one engineer in particular who asks better questions than she is supposed to.']),
    t('What are you looking for?','Whatever was here before the part they let us see. Every drive I open has room on it that nothing is using. Empty space is a decision somebody made.',
      ['Is that dangerous to say?','You have just heard me say it, so evidently I have decided it is worth the risk. Do not make me regret the demonstration.'],
      ['What have you found?','Enough to know I am not wrong. Not enough to be safe, which is the worst of the two positions to be in.']),
    t('Why tell me any of this?','Because somebody should know where to look if I stop being able to. That is not dramatics. It is filing.',
      ['Where should I look?','Where the record is too tidy. A thing that has been cleaned up was cleaned up by somebody.'],
      ['What if I am asked about you?','Then tell them the truth. I repair computers and I talk too much.']),
    t('About the cleaning.','Somebody went out, wiped a lens and walked over a hill. And the whole silo watched the picture get clearer and asked no further questions.',
      ['Should they have?','They should have asked why the picture needed a person to go and die to improve it.'],
      ['That is a dangerous question.','It is. It is also the only one in the room.'])]},
};

// --- everybody else ------------------------------------------------------
// Composed rather than templated: a trade, a home, somebody they know, a thing
// they keep and a thing they worry about, picked independently from the seed.
// Any two residents differ somewhere even when their trade matches.
const TRADES={
  porter:['Deliveries, up and down, all day. I know the stairs better than I know my own landing.','The bridge changes direction from floor to floor. Watch the next landing rather than your feet.'],
  diner:['I have a break before my next shift. Usually there is more conversation in here than this.','The sheriff’s station is through the side of the cafeteria. The directory is in the book on the table.'],
  bazaar:['Repairs and exchanges. Almost nothing down here is too old to be worth something to somebody.','There are shops down the side aisles as well as along the main street. The side aisles are the interesting ones.'],
  farm:['I work the crops. Water, light and patience, and you cannot hurry the last one however much anybody asks.','Agriculture has several growing areas. Keep off the beds; a footprint sets a plant back a fortnight.'],
  medical:['I help in Medical. We stretch every clean sheet and every working instrument further than we should have to.','The treatment rooms open off the department corridor. Someone at the desk will tell you which are free.'],
  mechanical:['Machinery and maintenance. You can feel the generator through the floor from here, if you stand still.','Mechanical is the lowest numbered level and the generator hall is beneath it. Mind the lanes.'],
  mines:['Mining shift. The rock makes you work for every useful piece and then makes you carry it.','Stay inside the supported passage. There is a drill at the working end and it does not stop for visitors.'],
  it:['Systems and records. A quiet terminal does not always mean nothing is happening on it.','IT is on Level nineteen. Ask at the entrance rather than walking into a work room.'],
  water:['Pumps, filters and pipework. A small leak becomes everybody’s problem the moment we leave it alone.','Water treatment is on Level fifty-five. You can see the circulation equipment from the walkway.'],
  recycling:['We sort what comes down the chutes and save whatever can be used again. Most of it can.','Try Supply or the bazaar before you throw away anything that still holds together.'],
  resident:['I live and work here like everybody else. Each floor has its own routine and you learn it in a week.','The galleries take you around a level and the central stairs take you between them. That is the whole map.'],
};
const KNOWN=['a neighbour who mends clothes for the whole landing','my brother, two floors down, who never visits','the woman who runs the stall at the end of our gallery','an old teacher of mine who still asks how I am getting on','a porter who brings news before the notices do','my cousin in Supply, who can get anything and admits to nothing'];
const KEEPSAKES=['a tin my grandmother grew herbs in, long after the herbs gave up','my father’s notebook of repairs, in his measurements, which were never standard','a wooden spoon worn down on one side by somebody I never met','a photograph so faded you have to be told what it is','a key to a room three families have had since','a child’s drawing of the stairs, with far too many landings'];
const WORRIES=['the stair is louder than it was. Nobody official has said anything, which is itself the thing','how quickly we all went back to work. It cannot be right to be that good at it','my landing is short two people and the requisition has been in since spring','the lights on our level have not been changed in longer than anyone will admit','that my children will ask me something and I will have to give them the answer I was given'];
const PLEASURES=['the music outside the common room on rest days. I take the long way home for it','a seat kept for me on a Tuesday. Sitting together turns out to be most of it','the first hour of a shift, before anything has broken','reading the notices. All of them. You learn who is arguing with whom'];
const hash=v=>{let h=2166136261;for(const c of String(v))h=Math.imul(h^c.charCodeAt(0),16777619);return h>>>0;};
// `>>` is a signed shift, so a hash above 2^31 comes back negative and a bare
// n%length indexes off the front of the array. Wrap it properly.
const pick=(list,n)=>list[((Math.trunc(n)%list.length)+list.length)%list.length];

function residentTopics(person,kind,cleaned){
  const n=hash(person.id||person.name||kind),history=personalHistory(person);
  const lines=TRADES[kind]||TRADES.resident;
  const level=Number.isInteger(person.level)?person.level:null;
  return [
    tid('work','What do you do here?',lines[0],
      ['How long have you done it?',`Long enough that my hands do it while I am thinking about something else. ${pick(['That is either mastery or a warning.','Most days I take that as a good sign.','I have decided not to examine that too closely.'],n>>>3)}`],
      ['Is it good work?',`It is work that somebody has to do, and I would rather it were somebody who cared whether it was done properly. ${pick(['Most days that is enough.','Some days that is not enough.','It has been enough for a long time now.'],n>>>5)}`]),
    tid('places','Where should I look around?',lines[1],
      ['What do people miss?','The repairs, the notices and the things people have kept on their sills. A directory tells you where a room is. The people in it tell you what it is for.'],
      ['Anywhere I should not go?','Nowhere that is not marked. The marks are honest here — if it says keep out, somebody has already found out why.']),
    // Two lives deep, so asking twice is not the same answer twice.
    {...tid('history','Tell me about yourself.',history[0],
      ['Who do you see most?',`Mostly ${pick(KNOWN,n>>>7)}.${level?` We are both around Level ${level}.`:''}`],
      ['Do you keep anything from before?',`I have ${pick(KEEPSAKES,n>>>11)}. It is worth nothing at all and I would not part with it.`]),replies:history},
    tid('off-shift','What is on your mind?',`Honestly? ${pick(WORRIES,n>>>13)}.`,
      ['Have you told anyone?',pick(['I have said it on my own landing. That is as far as things travel safely.','I have put it in writing, which I am told is the correct channel and is also where it stopped.','I am telling you, which is either very safe or very unwise.'],n>>>17)],
      ['What keeps you going?',`${pick(PLEASURES,n>>>19)}. ${history[1]}`]),
    ...(cleaned?[tid('cleaning','About the cleaning.','I watched with everyone else. It is the only time this room is ever quiet.',
      ['What did you make of it?',pick(['He was thorough with the lens. I keep coming back to that.','I could not tell you. I have stopped trying to make it into a story.','I looked at the room more than the screen, in the end.'],n>>>23)],
      ['Will people forget?','No. They will just stop saying it out loud, which people upstairs will mistake for the same thing.'])]:[]),
  ];
}

// Named residents know each other. Asking after somebody by name gets you that
// person's opinion rather than a line about their department.
const OPINIONS={
  juliette:{walker:'Walker taught her everything except when to stop asking.',shirley:'Shirley would go through a wall for her, and has.',pete:'Her father. They have not managed a conversation in years.'},
  shirley:{juliette:'The best of us, and the most trouble. Same fact.',knox:'He backs his people. You learn what that is worth down here.'},
  knox:{juliette:'My best hand and my biggest headache.',shirley:'She tells me when I am wrong. I have had worse deputies.'},
  walker:{juliette:'Jules. She had the hands before I had the patience.',carla:'Carla and I argue about value. She is right about the ledger.'},
  marnes:{jahns:'The Mayor walks it herself. Not many would.',holston:'Holston was my sheriff. I am not going to perform grief for a stranger.'},
  jahns:{marnes:'Sam has a practical answer for almost everything.',knox:'Knox says what the lower levels think. I would rather hear it.'},
  pete:{juliette:'My daughter. I have had years to find a better answer than the one I have.'},
  lukas:{bernard:'He has never asked to see my drawings. I think about that.'},
  bernard:{lukas:'Kyle is the best of them. Do not tell him I said so.'},
  sims:{camille:'My wife. She saw the work in me before I did.'},
  camille:{sims:'Robert carries it home whether he means to or not.'},
  carla:{walker:'Walker sees a circuit where the rest of us see scrap.'},
};

export function conversationFor(resident,{cleaned=false,playerName='',visits=0}={}){
  const id=resident.id;
  const raw=resident.kind||resident.appearance?.outfit||'resident';
  const kind=({engineer:'mechanical',workshop:'mechanical',miner:'mines',cafeteria:'diner'}[raw]||raw);
  const written=CAST[id];
  const topics=written?written.topics.map(topic=>({...topic})):residentTopics(resident,kind,cleaned);
  if(resident.workday&&resident.currentWork)topics.push(workConversation(resident.workday,resident.currentWork));
  // Who else they have an opinion about. One extra question, and it is only
  // there for the people who would actually have something to say.
  const opinions=OPINIONS[id];
  if(opinions){
    const names=Object.keys(opinions);
    topics.push({id:'others',label:'What about the others here?',reply:'Depends which of them you mean.',
      follow:names.map(who=>({id:'about-'+who,label:`And ${who[0].toUpperCase()+who.slice(1)}?`,reply:opinions[who]}))});
  }
  let greeting=written?written.greeting:'Morning. Have you found where you are going?';
  if(id==='walker'&&playerName.includes('Juliette'))greeting='Jules. Come here. What have you broken this time?';
  else if(id==='shirley'&&playerName.includes('Juliette'))greeting='There you are. I was wondering where you had got to.';
  else if(!written&&cleaned)greeting='You saw the cleaning too?';
  if(visits>0)greeting=[`Back again. What did you find?`,`We have a little time before the next shift. What is on your mind?`,`I remember you. Still exploring?`][(visits-1)%3];
  return {id,name:resident.name,
    role:resident.role||({diner:'Cafeteria resident',porter:'Porter',bazaar:'Bazaar trader'}[kind]||'Silo resident'),
    greeting,topics};
}

// Legacy, the machine in the vault on Level 19. Original dialogue in its
// voice, not transcribed television lines: it answers what it is asked, it
// declines what it will not say, and it volunteers things nobody asked for.
export const ALGORITHM={
  id:'algorithm',name:'THE ALGORITHM',role:'Legacy archive · Level 19',
  greeting:'You are not the Head of Information Technology. Your presence has been recorded. Ask.',
  topics:[
    {id:'what',label:'What are you?',reply:'I am the interface to the Legacy. The archive preserves books, records and other material from before your lifetime. State a subject. Access to individual records remains subject to authorisation.'},
    {id:'outside',label:'What is outside?',reply:'That question is answered on the screen in your cafeteria. You are asking me whether the screen is true. I am not authorised to widen that answer.'},
    {id:'cleaning',label:'Why do they clean?',reply:'A cleaning is recorded as an exterior maintenance event. That description does not account for a person’s reasons. I cannot provide private records of the people you watched.'},
    {id:'silo1',label:'Who do you answer to?',reply:'To the Pact, and to the order it protects. There are conditions under which I act without being asked. You would not enjoy meeting one.'},
    {id:'leave',label:'Say nothing further.',reply:'Recorded. The door behind you is the way you came in.'},
  ],
};

// Typed queries use the same bounded, original archive responses as topic buttons.
export function algorithmAnswer(query,{freeRoam=false,blueprint=false}={}){
  const q=String(query).toLowerCase().trim();
  if(/safeguard|gas|pipe|blueprint/.test(q))return freeRoam||blueprint?'Service references identify an isolation line. A drawing describes a system; it does not make the system safe. Confirm the pressure at the physical fitting.':'That service reference requires an archive record. No matching record is attached to this session.';
  if(/atbash|cipher|quinn/.test(q))return 'Atbash reverses an alphabet: A corresponds to Z, B to Y. A substitution can conceal a message without changing its length. Keep the original spacing when comparing a transcription.';
  if(/legacy|library|book|archive/.test(q))return 'The Legacy is an archive. Books, images and records can be searched by subject. Records held on external storage require a compatible reader. This session searches the material already held in the archive.';
  if(/star|sky|light/.test(q))return 'Repeated observations distinguish a moving light from a fixed one. Record its position and the time. A single image is not enough to establish a pattern.';
  if(/order|pact|rule/.test(q))return 'The Pact governs life within the silo. The Order is a separate body of instructions for those entrusted with it. Possession of a title does not make every record public.';
  if(/outside|clean/.test(q))return ALGORITHM.topics[1].reply;
  return 'No specific subject resolved. Try Legacy, stars, Atbash, or the Order. Service information requires its own reference.';
}
