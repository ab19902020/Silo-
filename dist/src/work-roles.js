// Specific responsibilities are original game writing. See docs/living-workdays.md
// for the book/TV departments that informed them; these are not a canonical roster.
const duty=(title,...tasks)=>({title,tasks});
export const WORK_ROLES=Object.freeze({
  porter:[
    duty('Parcel porter','Sorting addressed parcels','Carrying a sealed supply bundle','Collecting a delivery signature'),
    duty('Message runner','Sorting dispatch slips','Taking a message to the wing desk','Returning the signed reply'),
    duty('Stores courier','Checking a stores docket','Moving replacement parts','Returning the empty wrapping'),
  ],
  mechanical:[
    duty('Lamp circuit technician','Checking the gallery lamp circuit','Inspecting a lamp connection','Noting a fitting that needs replacement'),
    duty('Bearing mechanic','Listening for bearing chatter','Checking a bearing housing','Writing the next lubrication request'),
    duty('Toolroom fitter','Checking a spanner for wear','Sorting repaired hand tools','Signing a tool back into the rack'),
    duty('Ventilation mechanic','Inspecting a vent fastener','Checking the air-handling service list','Logging a rattling fan guard'),
  ],
  farm:[
    duty('Seed keeper','Sorting seed packets','Checking the germination tally','Preparing the next planting tray'),
    duty('Hydroponics attendant','Checking an irrigation coupling','Inspecting the crop water log','Recording a slow-draining channel'),
    duty('Harvest sorter','Checking the vegetable baskets','Separating the kitchen harvest','Preparing a crop delivery slip'),
  ],
  medical:[
    duty('Dressing-room orderly','Counting clean dressings','Checking a treatment tray','Writing a linen request'),
    duty('Clinic registrar','Checking the appointment ledger','Preparing the next patient record','Filing the shift notes'),
    duty('Medical stores keeper','Counting sealed clinic supplies','Checking a stores requisition','Preparing an orderly’s collection'),
  ],
  it:[
    duty('Terminal repairer','Checking a terminal fault report','Inspecting a replacement board','Recording a completed bench check'),
    duty('Systems log clerk','Comparing the terminal logs','Copying a fault reference','Preparing the duty technician’s list'),
    duty('Cable technician','Checking a cable termination','Inspecting a connector','Recording a damaged cable sleeve'),
  ],
  security:[
    duty('Gallery deputy','Checking the gallery patrol book','Making the next wing-door check','Taking a resident’s statement'),
    duty('Duty desk officer','Checking a visitor entry','Reviewing an incident slip','Preparing the next patrol handover'),
    duty('Judicial records guard','Checking a document collection','Inspecting a sealed file label','Recording who signed for the file'),
  ],
  kitchen:[
    duty('Counter server','Preparing the serving trays','Checking the next meal count','Returning the empty dishes'),
    duty('Pantry keeper','Checking the dry-store tally','Counting the kitchen parcels','Writing tomorrow’s ingredient request'),
    duty('Cafeteria attendant','Clearing the tables','Collecting the used cups','Setting out the next meal service'),
  ],
  trader:[
    duty('Supply dispatcher','Matching a parcel to its docket','Preparing a porter’s collection','Checking a returned receipt'),
    duty('Hardware stallkeeper','Sorting reclaimed fittings','Checking a customer’s repair list','Recording a traded part'),
    duty('Cloth merchant','Sorting folded cloth','Checking a mending order','Counting the day’s cloth exchanges'),
    duty('Stores stocktaker','Counting the shelf stock','Checking a requisition against the ledger','Noting the next shortage'),
  ],
  cleaner:[
    duty('Gallery caretaker','Wiping the gallery rail','Checking the landing cleaning round','Folding the used wiping cloths'),
    duty('Workshop cleaning attendant','Wiping a service surface','Sorting reusable cleaning rags','Logging a workshop spill'),
    duty('Doorway attendant','Wiping a door handle','Checking the wing entrance','Collecting worn cleaning cloths'),
  ],
  laundry:[
    duty('Work-clothes mender','Checking a torn work sleeve','Patching a worn cuff','Folding a repaired garment'),
    duty('Linen sorter','Matching linen to collection tickets','Folding a clean sheet','Preparing the next linen bundle'),
    duty('Laundry counter clerk','Checking a laundry ticket','Counting a returned bundle','Recording an unclaimed garment'),
  ],
  water:[
    duty('Filter attendant','Checking the filter service log','Inspecting a filter housing','Recording the next filter change'),
    duty('Pump tender','Checking a pump coupling','Reading the pump pressure gauge','Noting a worn seal'),
    duty('Water rounds technician','Checking a valve label','Comparing the flow readings','Recording a suspected leak'),
  ],
  recycling:[
    duty('Salvage sorter','Separating reusable fittings','Checking a salvage bundle','Preparing a return to Supply'),
    duty('Fastener reclaimer','Checking salvaged bolts','Sorting the reusable washers','Recording the recovered metal weight'),
    duty('Paper reclamation clerk','Sorting used ledger sheets','Checking a paper collection','Bundling material for reuse'),
  ],
  miner:[
    duty('Drill fitter','Checking a drill fitting','Inspecting the tool service list','Preparing the next drill kit'),
    duty('Support inspector','Checking a tunnel support record','Inspecting a support fastening','Noting the next crew’s inspection'),
    duty('Ore tally clerk','Checking an ore cart ticket','Recording a haul weight','Preparing the next shift’s tally'),
  ],
  clerk:[
    duty('Requisition clerk','Checking a household requisition','Copying the approved request','Filing the returned collection slip'),
    duty('Shift registrar','Checking the shift register','Recording a duty exchange','Preparing the next crew’s list'),
    duty('Housing records clerk','Checking a household record','Copying a repair request','Filing a resident’s change of address'),
  ],
  teacher:[
    duty('Lesson tutor','Preparing an arithmetic lesson','Checking an exercise book','Writing tomorrow’s practice questions'),
    duty('Book repair assistant','Checking a loose book cover','Sorting pages for repair','Returning a mended lesson book'),
    duty('Classroom materials keeper','Counting the lesson slates','Checking the chalk supply','Preparing the next class’s materials'),
  ],
  community:[
    duty('Neighbourhood helper','Checking a neighbour’s collection request','Updating the household help list','Preparing a message for a neighbour'),
    duty('Floor notice keeper','Checking the floor notices','Copying a local announcement','Sorting requests for the wing desk'),
    duty('Mending-circle organiser','Checking the shared mending list','Sorting donated repair cloth','Recording the next household collection'),
  ],
});

export const NAMED_DUTIES=Object.freeze({
  juliette:['Checking a troublesome pump fitting','Reviewing the Mechanical repair list','Preparing a replacement coupling'],
  sims:['Reviewing the Judicial duty roster','Checking a raider’s report','Preparing a security handover'],
  bernard:['Reviewing an IT incident report','Checking the systems duty list','Signing a restricted service request'],
  walker:['Examining a failed circuit board','Sorting reusable electronic components','Checking a repaired instrument'],
  knox:['Checking the generator maintenance book','Assigning the next repair crew','Reviewing a parts shortage'],
  shirley:['Checking a pump fitting','Inspecting a worn coupling','Recording a repair for the next shift'],
  cooper:['Checking tools against the apprentice list','Inspecting a fitting under supervision','Returning the crew’s tools'],
  teddy:['Sorting Mechanical stores','Checking a replacement fitting','Preparing a tool collection'],
  billings:['Reviewing the Pact duty notes','Checking a resident’s statement','Preparing a deputy’s handover'],
  hank:['Checking the Down Deep patrol book','Listening to a resident’s complaint','Writing the next gallery report'],
  marnes:['Checking the deputy’s case notes','Reviewing the duty desk record','Preparing the next patrol'],
  amundsen:['Checking the raider roster','Inspecting a Judicial dispatch','Recording an access check'],
  jahns:['Reading household petitions','Reviewing a department request','Preparing the next civic meeting'],
  meadows:['Reviewing a Judicial petition','Checking the case register','Preparing notes for a hearing'],
  carla:['Reviewing Supply shortages','Checking a porter’s manifest','Allocating reclaimed parts'],
  patrick:['Inspecting an old fitting','Checking a discreet repair request','Sorting salvage for exchange'],
  pete:['Reviewing a patient’s notes','Preparing the clinic rounds','Checking the treatment handover'],
  gloria:['Writing down a neighbour’s recollection','Sorting personal notes','Helping with a household request'],
  lukas:['Checking a terminal log','Comparing fault records','Preparing an IT service note'],
  camille:['Checking a household request','Preparing a family collection','Sorting neighbourhood messages'],
});
export const PERSONAL_ROUNDS=Object.freeze([
  ['Collecting a repaired work shirt','Catching up with a neighbour about tomorrow’s shift'],
  ['Returning a borrowed lesson book','Reading a few pages of a well-worn book'],
  ['Collecting a household supply bundle','Sorting small things to mend at home'],
  ['Dropping off a laundry ticket','Taking a quiet break near the gallery'],
  ['Returning a neighbour’s borrowed tool','Talking through the day with a neighbour'],
  ['Taking a repair request to the wing desk','Checking the local notices'],
]);
