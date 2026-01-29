/**
 * Import pipeline organizations from JSON
 * Run with: npx tsx scripts/import-pipeline-orgs.ts
 */

const jsonData = {
  "metadata": {
    "generated_at": "2026-01-30T00:00:00Z",
    "data_as_of": "2026-01-30",
    "total_organizations": 144,
    "summary": {
      "paying_customers": 8,
      "strong_prospects": 12,
      "demo_scheduled": 31,
      "prospects": 8,
      "active_trials": 19,
      "dormant": 42,
      "lost": 24
    }
  },
  "organizations": [
    {"org_name":"Synarchy","org_lifecycle_stage":"onboarded","deal_value":null,"sales_poc":null,"region":"Americas","domain":"NEO","prospect_source":"cold_outreach","demo_date":null,"trial_start_date":null,"deal_momentum":"positive","notes":"Paying customer - predates sheet creation"},
    {"org_name":"Cereal Docks Spa","org_lifecycle_stage":"onboarded","deal_value":null,"sales_poc":"Satish","region":"EMEA","domain":"AF&B","prospect_source":"cold_outreach","demo_date":null,"trial_start_date":null,"deal_momentum":"positive","notes":"Paying user - onboarding completed"},
    {"org_name":"Kemin Industries","org_lifecycle_stage":"onboarded","deal_value":null,"sales_poc":"Kartheek","region":"APAC","domain":"AF&B","prospect_source":"cold_outreach","demo_date":null,"trial_start_date":null,"deal_momentum":"positive","notes":"Paying user - onboarding completed"},
    {"org_name":"Wipak Oy","org_lifecycle_stage":"onboarded","deal_value":null,"sales_poc":"Sudeshana","region":"EMEA","domain":"NEO","prospect_source":"cold_outreach","demo_date":null,"trial_start_date":null,"deal_momentum":"positive","notes":"Paying user - awaiting contract"},
    {"org_name":"The Unit Group LTD","org_lifecycle_stage":"onboarded","deal_value":null,"sales_poc":"Satish","region":"MEA","domain":"NEO","prospect_source":"cold_outreach","demo_date":null,"trial_start_date":null,"deal_momentum":"positive","notes":"Pricing shared - payment awaited for onboarding"},
    {"org_name":"Israel Export Institute","org_lifecycle_stage":"onboarded","deal_value":null,"sales_poc":"Sudeshana","region":"MEA","domain":"NEO","prospect_source":"cold_outreach","demo_date":null,"trial_start_date":null,"deal_momentum":"positive","notes":"Paying user - all good so far"},
    {"org_name":"Mitsubishi Chemical America Inc.","org_lifecycle_stage":"onboarded","deal_value":null,"sales_poc":"Satya","region":"Americas","domain":"E&C","prospect_source":"cold_outreach","demo_date":null,"trial_start_date":null,"deal_momentum":"positive","notes":"Paying user - onboarding scheduled"},
    {"org_name":"ANDECO","org_lifecycle_stage":"onboarded","deal_value":null,"sales_poc":"Satya","region":"Americas","domain":"NEO","prospect_source":"cold_outreach","demo_date":null,"trial_start_date":null,"deal_momentum":"positive","notes":"Paying user - onboarding done"},
    {"org_name":"Ergomed Group","org_lifecycle_stage":"negotiation","deal_value":null,"sales_poc":"Nikita","region":"EMEA","domain":"HC","prospect_source":"cold_outreach","demo_date":null,"trial_start_date":null,"deal_momentum":"positive","notes":"Quote sent, final decision awaited"},
    {"org_name":"Wacker Chemie","org_lifecycle_stage":"negotiation","deal_value":null,"sales_poc":"Satya","region":"EMEA","domain":"E&C","prospect_source":"cold_outreach","demo_date":null,"trial_start_date":null,"deal_momentum":"positive","notes":"Quote sent for single license - feedback awaiting Feb 1st half"},
    {"org_name":"Schneider Electric","org_lifecycle_stage":"negotiation","deal_value":null,"sales_poc":"Satya","region":"EMEA","domain":"NEO","prospect_source":"cold_outreach","demo_date":null,"trial_start_date":null,"deal_momentum":"positive","notes":"Feedback call scheduled for Feb 16th for commercial discussions"},
    {"org_name":"ExxonMobil","org_lifecycle_stage":"negotiation","deal_value":null,"sales_poc":"Satya","region":"Americas","domain":"E&C","prospect_source":"cold_outreach","demo_date":null,"trial_start_date":null,"deal_momentum":"positive","notes":"Pricing shared - final feedback expected by end of January"},
    {"org_name":"Amazon Luxembourg","org_lifecycle_stage":"negotiation","deal_value":null,"sales_poc":"Kirandeep","region":"EMEA","domain":"TMT","prospect_source":"cold_outreach","demo_date":null,"trial_start_date":null,"deal_momentum":"positive","notes":"Currently in negotiation - decision expected by Feb-end"},
    {"org_name":"Foremost Farms","org_lifecycle_stage":"negotiation","deal_value":null,"sales_poc":"Satish","region":"Americas","domain":"AF&B","prospect_source":"cold_outreach","demo_date":null,"trial_start_date":null,"deal_momentum":"positive","notes":"Pricing shared - awaiting final signoff"},
    {"org_name":"Horwath HTL","org_lifecycle_stage":"negotiation","deal_value":null,"sales_poc":"Kirandeep","region":"EMEA","domain":"NEO","prospect_source":"cold_outreach","demo_date":null,"trial_start_date":null,"deal_momentum":"positive","notes":"On board - waiting for signed contract"},
    {"org_name":"Rich Corporation","org_lifecycle_stage":"negotiation","deal_value":null,"sales_poc":"Satish","region":"Americas","domain":"AF&B","prospect_source":"cold_outreach","demo_date":null,"trial_start_date":null,"deal_momentum":"positive","notes":"Pricing shared - awaiting final decision"},
    {"org_name":"Solutions for Development Consulting","org_lifecycle_stage":"negotiation","deal_value":null,"sales_poc":"Kirandeep","region":"MEA","domain":"NEO","prospect_source":"cold_outreach","demo_date":null,"trial_start_date":null,"deal_momentum":"positive","notes":"Quote sent - final decision by end of Jan"},
    {"org_name":"Dubai Investments","org_lifecycle_stage":"negotiation","deal_value":null,"sales_poc":"Satya","region":"MEA","domain":"NEO","prospect_source":"cold_outreach","demo_date":null,"trial_start_date":null,"deal_momentum":"positive","notes":"Pricing shared - awaiting final signoff"},
    {"org_name":"Transit DXB","org_lifecycle_stage":"negotiation","deal_value":null,"sales_poc":"Satish","region":"MEA","domain":"NEO","prospect_source":"cold_outreach","demo_date":null,"trial_start_date":null,"deal_momentum":"positive","notes":"Pricing shared - awaiting final decision. Also active trial user."},
    {"org_name":"JLL","org_lifecycle_stage":"demo_done","deal_value":null,"sales_poc":"Sudeshana","region":"MEA","domain":"NEO","prospect_source":"cold_outreach","demo_date":null,"trial_start_date":null,"deal_momentum":"neutral","notes":"Demo rescheduled - expected in February"},
    {"org_name":"Sygnoses","org_lifecycle_stage":"demo_done","deal_value":null,"sales_poc":"Satish","region":"APAC","domain":"NEO","prospect_source":"cold_outreach","demo_date":null,"trial_start_date":null,"deal_momentum":"neutral","notes":"Demo completed - awaiting timeslots for trial access"},
    {"org_name":"Church & Dwight","org_lifecycle_stage":"demo_done","deal_value":null,"sales_poc":"Satish","region":"Americas","domain":"AF&B","prospect_source":"cold_outreach","demo_date":null,"trial_start_date":null,"deal_momentum":"neutral","notes":"Demo completed - trial access expected in Feb"},
    {"org_name":"Data Center Prime","org_lifecycle_stage":"demo_done","deal_value":null,"sales_poc":"Sudeshana","region":"MEA","domain":"TMT","prospect_source":"cold_outreach","demo_date":null,"trial_start_date":null,"deal_momentum":"neutral","notes":"Demo rescheduled for 5th Feb"},
    {"org_name":"Efficio Consulting","org_lifecycle_stage":"demo_done","deal_value":null,"sales_poc":"Nikita","region":"EMEA","domain":"NEO","prospect_source":"cold_outreach","demo_date":null,"trial_start_date":null,"deal_momentum":"neutral","notes":"Demo completed - need to get trial details for rollout"},
    {"org_name":"MB Holding","org_lifecycle_stage":"demo_done","deal_value":null,"sales_poc":"Kirandeep","region":"MEA","domain":"NEO","prospect_source":"cold_outreach","demo_date":null,"trial_start_date":null,"deal_momentum":"neutral","notes":"Demo completed"},
    {"org_name":"GSK","org_lifecycle_stage":"demo_done","deal_value":null,"sales_poc":"Satish","region":"EMEA","domain":"HC","prospect_source":"cold_outreach","demo_date":null,"trial_start_date":null,"deal_momentum":"neutral","notes":"Demo rescheduled for February"},
    {"org_name":"Apollo Hospitals","org_lifecycle_stage":"demo_done","deal_value":null,"sales_poc":"Satish","region":"APAC","domain":"HC","prospect_source":"cold_outreach","demo_date":null,"trial_start_date":null,"deal_momentum":"neutral","notes":"Demo completed - trial to be provided based on available slots"},
    {"org_name":"Mizuho Bank","org_lifecycle_stage":"demo_done","deal_value":null,"sales_poc":"Satish","region":"APAC","domain":"NEO","prospect_source":"cold_outreach","demo_date":null,"trial_start_date":null,"deal_momentum":"neutral","notes":"Demo completed - trial to be provided based on available slots"},
    {"org_name":"GEA","org_lifecycle_stage":"demo_done","deal_value":null,"sales_poc":"Nikita","region":"EMEA","domain":"NEO","prospect_source":"cold_outreach","demo_date":null,"trial_start_date":null,"deal_momentum":"neutral","notes":"Will likely need some more time to get back to us"},
    {"org_name":"FTQ Solidarity Fund","org_lifecycle_stage":"demo_done","deal_value":null,"sales_poc":"Satya","region":"Americas","domain":"NEO","prospect_source":"cold_outreach","demo_date":null,"trial_start_date":null,"deal_momentum":"neutral","notes":"Demo completed - awaiting timeslots for trial access"},
    {"org_name":"JBIC","org_lifecycle_stage":"demo_done","deal_value":null,"sales_poc":"Kirandeep","region":"APAC","domain":"NEO","prospect_source":"cold_outreach","demo_date":null,"trial_start_date":null,"deal_momentum":"neutral","notes":"Need to establish contact for whitelisting with IT team"},
    {"org_name":"MS Partner Qatar","org_lifecycle_stage":"demo_done","deal_value":null,"sales_poc":"Nikita","region":"MEA","domain":"NEO","prospect_source":"cold_outreach","demo_date":null,"trial_start_date":null,"deal_momentum":"neutral","notes":"Expected to have another demo call with partners from Dubai in Feb"},
    {"org_name":"SANAD","org_lifecycle_stage":"demo_done","deal_value":null,"sales_poc":"Nikita","region":"MEA","domain":"NEO","prospect_source":"cold_outreach","demo_date":null,"trial_start_date":null,"deal_momentum":"neutral","notes":"Demo call rescheduled"},
    {"org_name":"Americana Food","org_lifecycle_stage":"demo_done","deal_value":null,"sales_poc":"Kirandeep","region":"MEA","domain":"AF&B","prospect_source":"cold_outreach","demo_date":null,"trial_start_date":null,"deal_momentum":"neutral","notes":"On leave - will get back by Jan end"},
    {"org_name":"Fast Track Europe","org_lifecycle_stage":"demo_done","deal_value":null,"sales_poc":"Nikita","region":"EMEA","domain":"NEO","prospect_source":"cold_outreach","demo_date":null,"trial_start_date":null,"deal_momentum":"neutral","notes":"Expected to confirm trial accounts by Jan-end"},
    {"org_name":"dsm-firmenich","org_lifecycle_stage":"demo_done","deal_value":null,"sales_poc":"Satish","region":"EMEA","domain":"AF&B","prospect_source":"cold_outreach","demo_date":null,"trial_start_date":null,"deal_momentum":"neutral","notes":"Demo completed 27th Jan - trial to be scheduled in Feb 1st week"},
    {"org_name":"IQVIA","org_lifecycle_stage":"demo_done","deal_value":null,"sales_poc":"Satish","region":"APAC","domain":"HC","prospect_source":"cold_outreach","demo_date":null,"trial_start_date":null,"deal_momentum":"neutral","notes":"Demo completed - awaiting trial usage"},
    {"org_name":"Lavajet","org_lifecycle_stage":"demo_done","deal_value":null,"sales_poc":"Nikita","region":"MEA","domain":"NEO","prospect_source":"cold_outreach","demo_date":null,"trial_start_date":null,"deal_momentum":"neutral","notes":"Expected to confirm trial accounts by Jan-end"},
    {"org_name":"Westrock","org_lifecycle_stage":"demo_done","deal_value":null,"sales_poc":"Sudeshana","region":"Americas","domain":"NEO","prospect_source":"cold_outreach","demo_date":null,"trial_start_date":null,"deal_momentum":"neutral","notes":"Waiting for demo slots - had positive touchpoint initially"},
    {"org_name":"Niterra EMEA GmbH","org_lifecycle_stage":"demo_done","deal_value":null,"sales_poc":"Satya","region":"EMEA","domain":"AAD","prospect_source":"cold_outreach","demo_date":null,"trial_start_date":null,"deal_momentum":"neutral","notes":"Demo scheduled for February 5th"},
    {"org_name":"Halwani Bros","org_lifecycle_stage":"demo_done","deal_value":null,"sales_poc":"Satish","region":"MEA","domain":"AF&B","prospect_source":"cold_outreach","demo_date":null,"trial_start_date":null,"deal_momentum":"neutral","notes":"Demo call scheduled for 28th January"},
    {"org_name":"Ingredion","org_lifecycle_stage":"demo_done","deal_value":null,"sales_poc":"Satish","region":"Americas","domain":"AF&B","prospect_source":"cold_outreach","demo_date":null,"trial_start_date":null,"deal_momentum":"neutral","notes":"Demo call scheduled for 28th January"},
    {"org_name":"Dr. Reddy's Laboratories","org_lifecycle_stage":"demo_done","deal_value":null,"sales_poc":"Satish","region":"APAC","domain":"HC","prospect_source":"cold_outreach","demo_date":null,"trial_start_date":null,"deal_momentum":"neutral","notes":"Demo call scheduled for 28th January"},
    {"org_name":"Automation Anywhere","org_lifecycle_stage":"demo_done","deal_value":null,"sales_poc":"Satish","region":"Americas","domain":"TMT","prospect_source":"cold_outreach","demo_date":null,"trial_start_date":null,"deal_momentum":"neutral","notes":"Demo call scheduled for 29th January"},
    {"org_name":"Veritas Development Advisors","org_lifecycle_stage":"demo_done","deal_value":null,"sales_poc":"Nikita","region":"Americas","domain":"NEO","prospect_source":"cold_outreach","demo_date":null,"trial_start_date":null,"deal_momentum":"neutral","notes":"Demo call scheduled for 27th January"},
    {"org_name":"Golden Apex Capital","org_lifecycle_stage":"demo_done","deal_value":null,"sales_poc":"Satish","region":"APAC","domain":"NEO","prospect_source":"cold_outreach","demo_date":null,"trial_start_date":null,"deal_momentum":"neutral","notes":"Demo completed - awaiting timeslots for trial access"},
    {"org_name":"Georg Fischer AG","org_lifecycle_stage":"demo_done","deal_value":null,"sales_poc":"Kirandeep","region":"EMEA","domain":"NEO","prospect_source":"cold_outreach","demo_date":null,"trial_start_date":null,"deal_momentum":"neutral","notes":"Intro stage"},
    {"org_name":"OCP Nutricrops","org_lifecycle_stage":"demo_done","deal_value":null,"sales_poc":"Satish","region":"MEA","domain":"AF&B","prospect_source":"cold_outreach","demo_date":null,"trial_start_date":null,"deal_momentum":"neutral","notes":"Follow-up scheduled for February"},
    {"org_name":"Saudi Aramco","org_lifecycle_stage":"demo_done","deal_value":null,"sales_poc":"Satya","region":"MEA","domain":"E&C","prospect_source":"cold_outreach","demo_date":null,"trial_start_date":null,"deal_momentum":"neutral","notes":"Demo completed - awaiting clearance from IT team"},
    {"org_name":"Aeon Credit Service","org_lifecycle_stage":"demo_done","deal_value":null,"sales_poc":"Satish","region":"APAC","domain":"NEO","prospect_source":"cold_outreach","demo_date":null,"trial_start_date":null,"deal_momentum":"neutral","notes":"Demo completed - awaiting timeslots for trial access"},
    {"org_name":"Aramex","org_lifecycle_stage":"prospect","deal_value":null,"sales_poc":"Nikita","region":"MEA","domain":"NEO","prospect_source":"cold_outreach","demo_date":null,"trial_start_date":null,"deal_momentum":"neutral","notes":"Prospect"},
    {"org_name":"Touché Consulting","org_lifecycle_stage":"prospect","deal_value":null,"sales_poc":"Sudeshana","region":"EMEA","domain":"NEO","prospect_source":"cold_outreach","demo_date":null,"trial_start_date":null,"deal_momentum":"neutral","notes":"Discussing partnership opportunities in Italy/KSA"},
    {"org_name":"Becton, Dickinson and Company","org_lifecycle_stage":"prospect","deal_value":null,"sales_poc":"Nikita","region":"Americas","domain":"HC","prospect_source":"cold_outreach","demo_date":null,"trial_start_date":null,"deal_momentum":"neutral","notes":"Tentative pricing shared - awaiting trial usage or feedback"},
    {"org_name":"Total Energies","org_lifecycle_stage":"prospect","deal_value":null,"sales_poc":"Satya","region":"EMEA","domain":"E&C","prospect_source":"cold_outreach","demo_date":null,"trial_start_date":null,"deal_momentum":"neutral","notes":"Pricing shared - awaiting final decision"},
    {"org_name":"TD Synnex","org_lifecycle_stage":"prospect","deal_value":null,"sales_poc":"Kartheek","region":"EMEA","domain":"TMT","prospect_source":"cold_outreach","demo_date":null,"trial_start_date":null,"deal_momentum":"neutral","notes":"Prospect - awaiting final feedback"},
    {"org_name":"Ceva Almajdouie Logistics","org_lifecycle_stage":"prospect","deal_value":null,"sales_poc":"Kirandeep","region":"MEA","domain":"NEO","prospect_source":"cold_outreach","demo_date":null,"trial_start_date":null,"deal_momentum":"neutral","notes":"Last touch point was on 26th January"},
    {"org_name":"Sherwin-Williams","org_lifecycle_stage":"prospect","deal_value":null,"sales_poc":"Satya","region":"EMEA","domain":"NEO","prospect_source":"cold_outreach","demo_date":null,"trial_start_date":null,"deal_momentum":"neutral","notes":"Demo scheduled on January 28th"},
    {"org_name":"DAL Group","org_lifecycle_stage":"prospect","deal_value":null,"sales_poc":"Satish","region":"MEA","domain":"NEO","prospect_source":"cold_outreach","demo_date":null,"trial_start_date":null,"deal_momentum":"neutral","notes":"Prospect"},
    {"org_name":"Littler Associates","org_lifecycle_stage":"trial_active","deal_value":null,"sales_poc":"Nikita","region":"MEA","domain":"NEO","prospect_source":"cold_outreach","demo_date":null,"trial_start_date":null,"deal_momentum":"positive","notes":"Currently active - need to schedule feedback call"},
    {"org_name":"athGADLANG","org_lifecycle_stage":"trial_active","deal_value":null,"sales_poc":"Nikita","region":"MEA","domain":"NEO","prospect_source":"cold_outreach","demo_date":null,"trial_start_date":null,"deal_momentum":"positive","notes":"Trial used - feedback scheduled for Jan 30"},
    {"org_name":"O-I Glass","org_lifecycle_stage":"trial_active","deal_value":null,"sales_poc":"Sudeshana","region":"Americas","domain":"NEO","prospect_source":"cold_outreach","demo_date":null,"trial_start_date":null,"deal_momentum":"positive","notes":"Feedback call scheduled - used myRA a couple times"},
    {"org_name":"Mitsui & Co.","org_lifecycle_stage":"trial_active","deal_value":null,"sales_poc":"Nikita","region":"APAC","domain":"NEO","prospect_source":"cold_outreach","demo_date":null,"trial_start_date":null,"deal_momentum":"positive","notes":"Trial active - need to schedule feedback call"},
    {"org_name":"Mitsui Chemicals Europe","org_lifecycle_stage":"trial_active","deal_value":null,"sales_poc":"Nikita","region":"EMEA","domain":"E&C","prospect_source":"cold_outreach","demo_date":null,"trial_start_date":null,"deal_momentum":"positive","notes":"Longshot - will take time to internalize"},
    {"org_name":"TDK","org_lifecycle_stage":"trial_active","deal_value":null,"sales_poc":"Sudeshana","region":"APAC","domain":"TMT","prospect_source":"cold_outreach","demo_date":null,"trial_start_date":null,"deal_momentum":"positive","notes":"Feedback call scheduled - expected to move in February"},
    {"org_name":"AICircle","org_lifecycle_stage":"trial_active","deal_value":null,"sales_poc":"Kirandeep","region":"APAC","domain":"NEO","prospect_source":"cold_outreach","demo_date":null,"trial_start_date":null,"deal_momentum":"positive","notes":"Recently rolled out - active"},
    {"org_name":"Actio Consultancy","org_lifecycle_stage":"trial_active","deal_value":null,"sales_poc":"Nikita","region":"MEA","domain":"NEO","prospect_source":"cold_outreach","demo_date":null,"trial_start_date":null,"deal_momentum":"positive","notes":"Decision expected Jan-end"},
    {"org_name":"Vardaan Global","org_lifecycle_stage":"trial_active","deal_value":null,"sales_poc":"Satish","region":"APAC","domain":"NEO","prospect_source":"cold_outreach","demo_date":null,"trial_start_date":null,"deal_momentum":"positive","notes":"Feedback call scheduled for 30th January"},
    {"org_name":"Piramal Group","org_lifecycle_stage":"trial_active","deal_value":null,"sales_poc":"Nikita","region":"APAC","domain":"AF&B","prospect_source":"cold_outreach","demo_date":null,"trial_start_date":null,"deal_momentum":"positive","notes":"Awaiting feedback after research team clarification"},
    {"org_name":"Tirex Chargers","org_lifecycle_stage":"trial_active","deal_value":null,"sales_poc":"Satish","region":"APAC","domain":"NEO","prospect_source":"cold_outreach","demo_date":null,"trial_start_date":null,"deal_momentum":"positive","notes":"Trial active - need to schedule feedback call"},
    {"org_name":"Sojitz","org_lifecycle_stage":"trial_active","deal_value":null,"sales_poc":"Satish","region":"APAC","domain":"NEO","prospect_source":"cold_outreach","demo_date":null,"trial_start_date":null,"deal_momentum":"positive","notes":"Feedback call completed - positive but will take time"},
    {"org_name":"Novonesis","org_lifecycle_stage":"trial_active","deal_value":null,"sales_poc":"Satish","region":"EMEA","domain":"AF&B","prospect_source":"cold_outreach","demo_date":null,"trial_start_date":null,"deal_momentum":"positive","notes":"Broader team to join - call scheduled for Jan 28"},
    {"org_name":"Linc Group","org_lifecycle_stage":"trial_active","deal_value":null,"sales_poc":"Kirandeep","region":"APAC","domain":"NEO","prospect_source":"cold_outreach","demo_date":null,"trial_start_date":null,"deal_momentum":"positive","notes":"Last touch point was on 22nd January"},
    {"org_name":"Pure Insights","org_lifecycle_stage":"trial_active","deal_value":null,"sales_poc":"Kirandeep","region":"MEA","domain":"NEO","prospect_source":"cold_outreach","demo_date":null,"trial_start_date":null,"deal_momentum":"positive","notes":"Last touch point was on 26th January"},
    {"org_name":"FinAgra","org_lifecycle_stage":"trial_active","deal_value":null,"sales_poc":"Satish","region":"Americas","domain":"AF&B","prospect_source":"cold_outreach","demo_date":null,"trial_start_date":null,"deal_momentum":"positive","notes":"Recently rolled out - active"},
    {"org_name":"GRIT","org_lifecycle_stage":"trial_active","deal_value":null,"sales_poc":"Nikita","region":"EMEA","domain":"NEO","prospect_source":"cold_outreach","demo_date":null,"trial_start_date":null,"deal_momentum":"positive","notes":"Active trial"},
    {"org_name":"VST Tractors","org_lifecycle_stage":"trial_active","deal_value":null,"sales_poc":"Satish","region":"APAC","domain":"AAD","prospect_source":"cold_outreach","demo_date":null,"trial_start_date":null,"deal_momentum":"positive","notes":"Demo completed - in-person visit expected in February"},
    {"org_name":"HH Global","org_lifecycle_stage":"trial_expired","deal_value":null,"sales_poc":"Kartheek","region":"Global","domain":"NEO","prospect_source":"cold_outreach","demo_date":null,"trial_start_date":null,"deal_momentum":"stalled","notes":"Liked platform but keep buying syndicated reports"},
    {"org_name":"Qiddiya Investment Company","org_lifecycle_stage":"trial_expired","deal_value":null,"sales_poc":"Sudeshana","region":"MEA","domain":"NEO","prospect_source":"cold_outreach","demo_date":null,"trial_start_date":null,"deal_momentum":"stalled","notes":"Trial extended but no usage yet"},
    {"org_name":"Huawei","org_lifecycle_stage":"trial_expired","deal_value":null,"sales_poc":"Sudeshana","region":"APAC","domain":"TMT","prospect_source":"cold_outreach","demo_date":null,"trial_start_date":null,"deal_momentum":"stalled","notes":"Trying to schedule after meeting in Dubai"},
    {"org_name":"Teleperformance","org_lifecycle_stage":"trial_expired","deal_value":null,"sales_poc":"Satish","region":"Global","domain":"NEO","prospect_source":"cold_outreach","demo_date":null,"trial_start_date":null,"deal_momentum":"stalled","notes":"Liked platform but not expected to buy soon"},
    {"org_name":"Protiviti","org_lifecycle_stage":"trial_expired","deal_value":null,"sales_poc":"Sudeshana","region":"MEA","domain":"NEO","prospect_source":"cold_outreach","demo_date":null,"trial_start_date":null,"deal_momentum":"stalled","notes":"Not expected anytime soon"},
    {"org_name":"Reliance Industries","org_lifecycle_stage":"trial_expired","deal_value":null,"sales_poc":"Satish","region":"APAC","domain":"E&C","prospect_source":"cold_outreach","demo_date":null,"trial_start_date":null,"deal_momentum":"stalled","notes":"Not expected to change anytime soon"},
    {"org_name":"Symrise","org_lifecycle_stage":"trial_expired","deal_value":null,"sales_poc":"Satish","region":"EMEA","domain":"AF&B","prospect_source":"cold_outreach","demo_date":null,"trial_start_date":null,"deal_momentum":"stalled","notes":"Awaiting timeslots for trial access"},
    {"org_name":"Paper Link International","org_lifecycle_stage":"trial_expired","deal_value":null,"sales_poc":"Sudeshana","region":"MEA","domain":"NEO","prospect_source":"cold_outreach","demo_date":null,"trial_start_date":null,"deal_momentum":"stalled","notes":"Awaiting trial usage"},
    {"org_name":"Circle K","org_lifecycle_stage":"trial_expired","deal_value":null,"sales_poc":"Nikita","region":"EMEA","domain":"AF&B","prospect_source":"cold_outreach","demo_date":null,"trial_start_date":null,"deal_momentum":"stalled","notes":"Will probably revisit in March"},
    {"org_name":"Tony Blair Institute","org_lifecycle_stage":"trial_expired","deal_value":null,"sales_poc":"Nikita","region":"EMEA","domain":"NEO","prospect_source":"cold_outreach","demo_date":null,"trial_start_date":null,"deal_momentum":"stalled","notes":"Internal restructuring - will respond later"},
    {"org_name":"Advantest","org_lifecycle_stage":"trial_expired","deal_value":null,"sales_poc":"Sudeshana","region":"APAC","domain":"TMT","prospect_source":"cold_outreach","demo_date":null,"trial_start_date":null,"deal_momentum":"stalled","notes":"Expected to set up POC for manager buy-in"},
    {"org_name":"Aboitiz Equity Ventures","org_lifecycle_stage":"trial_expired","deal_value":null,"sales_poc":"Satish","region":"APAC","domain":"AF&B","prospect_source":"cold_outreach","demo_date":null,"trial_start_date":null,"deal_momentum":"stalled","notes":"Awaiting timeslots for trial access"},
    {"org_name":"TCS","org_lifecycle_stage":"trial_expired","deal_value":null,"sales_poc":"Satish","region":"APAC","domain":"TMT","prospect_source":"cold_outreach","demo_date":null,"trial_start_date":null,"deal_momentum":"stalled","notes":"Positive but will take time"},
    {"org_name":"SixthFactor Consulting","org_lifecycle_stage":"trial_expired","deal_value":null,"sales_poc":"Nikita","region":"APAC","domain":"NEO","prospect_source":"cold_outreach","demo_date":null,"trial_start_date":null,"deal_momentum":"stalled","notes":"Longshot - liked myRA but been evasive"},
    {"org_name":"Air India","org_lifecycle_stage":"trial_expired","deal_value":null,"sales_poc":"Sudeshana","region":"APAC","domain":"NEO","prospect_source":"cold_outreach","demo_date":null,"trial_start_date":null,"deal_momentum":"stalled","notes":"Trial not rolled out yet"},
    {"org_name":"Nexdigm","org_lifecycle_stage":"trial_expired","deal_value":null,"sales_poc":"Satya","region":"APAC","domain":"NEO","prospect_source":"cold_outreach","demo_date":null,"trial_start_date":null,"deal_momentum":"stalled","notes":"Trial access provided - awaiting usage"},
    {"org_name":"Arcelomittal","org_lifecycle_stage":"trial_expired","deal_value":null,"sales_poc":"Nikita","region":"EMEA","domain":"E&C","prospect_source":"cold_outreach","demo_date":null,"trial_start_date":null,"deal_momentum":"stalled","notes":"Very busy - long shot"},
    {"org_name":"CBIZ","org_lifecycle_stage":"trial_expired","deal_value":null,"sales_poc":"Satish","region":"Americas","domain":"NEO","prospect_source":"cold_outreach","demo_date":null,"trial_start_date":null,"deal_momentum":"stalled","notes":"Awaiting trial usage"},
    {"org_name":"AlixPartners","org_lifecycle_stage":"trial_expired","deal_value":null,"sales_poc":"Satish","region":"Americas","domain":"NEO","prospect_source":"cold_outreach","demo_date":null,"trial_start_date":null,"deal_momentum":"stalled","notes":"Awaiting trial usage"},
    {"org_name":"Al-Futtaim","org_lifecycle_stage":"trial_expired","deal_value":null,"sales_poc":"Nikita","region":"MEA","domain":"NEO","prospect_source":"cold_outreach","demo_date":null,"trial_start_date":null,"deal_momentum":"stalled","notes":"Long shot"},
    {"org_name":"FCB Newlink","org_lifecycle_stage":"trial_expired","deal_value":null,"sales_poc":"Satish","region":"Americas","domain":"NEO","prospect_source":"cold_outreach","demo_date":null,"trial_start_date":null,"deal_momentum":"stalled","notes":"Long shot"},
    {"org_name":"Selected Group","org_lifecycle_stage":"trial_expired","deal_value":null,"sales_poc":"Satish","region":"EMEA","domain":"AF&B","prospect_source":"cold_outreach","demo_date":null,"trial_start_date":null,"deal_momentum":"stalled","notes":"Positive but won't act anytime soon"},
    {"org_name":"GoodyCo","org_lifecycle_stage":"trial_expired","deal_value":null,"sales_poc":"Satish","region":"MEA","domain":"AF&B","prospect_source":"cold_outreach","demo_date":null,"trial_start_date":null,"deal_momentum":"stalled","notes":"To be revisited after several months"},
    {"org_name":"Endiya Partners","org_lifecycle_stage":"trial_expired","deal_value":null,"sales_poc":null,"region":"APAC","domain":"NEO","prospect_source":"cold_outreach","demo_date":null,"trial_start_date":null,"deal_momentum":"stalled","notes":"Dormant"},
    {"org_name":"Mitsui OSK Group","org_lifecycle_stage":"trial_expired","deal_value":null,"sales_poc":"Krati","region":"APAC","domain":"NEO","prospect_source":"cold_outreach","demo_date":null,"trial_start_date":null,"deal_momentum":"stalled","notes":"Pricing shared - dormant"},
    {"org_name":"PayTabs","org_lifecycle_stage":"trial_expired","deal_value":null,"sales_poc":"Sudeshana","region":"MEA","domain":"TMT","prospect_source":"cold_outreach","demo_date":null,"trial_start_date":null,"deal_momentum":"stalled","notes":"No usage yet"},
    {"org_name":"EPC Group","org_lifecycle_stage":"trial_expired","deal_value":null,"sales_poc":"Sudeshana","region":"EMEA","domain":"NEO","prospect_source":"cold_outreach","demo_date":null,"trial_start_date":null,"deal_momentum":"stalled","notes":"Need to reactivate"},
    {"org_name":"Sterling-Rice Group","org_lifecycle_stage":"trial_expired","deal_value":null,"sales_poc":"Satish","region":"Americas","domain":"AF&B","prospect_source":"cold_outreach","demo_date":null,"trial_start_date":null,"deal_momentum":"stalled","notes":"Awaiting final decision - stalled"},
    {"org_name":"Samsung","org_lifecycle_stage":"trial_expired","deal_value":null,"sales_poc":"Sudeshana","region":"APAC","domain":"TMT","prospect_source":"cold_outreach","demo_date":null,"trial_start_date":null,"deal_momentum":"stalled","notes":"Long shot - will take several months"},
    {"org_name":"AP Winner","org_lifecycle_stage":"trial_expired","deal_value":null,"sales_poc":"Satya","region":"Americas","domain":"NEO","prospect_source":"cold_outreach","demo_date":null,"trial_start_date":null,"deal_momentum":"stalled","notes":"Dormant"},
    {"org_name":"Aleris Animal Nutrition","org_lifecycle_stage":"trial_expired","deal_value":null,"sales_poc":"Satya","region":"Americas","domain":"AF&B","prospect_source":"cold_outreach","demo_date":null,"trial_start_date":null,"deal_momentum":"stalled","notes":"Dormant"},
    {"org_name":"Almarai","org_lifecycle_stage":"trial_expired","deal_value":null,"sales_poc":"Satish","region":"MEA","domain":"AF&B","prospect_source":"cold_outreach","demo_date":null,"trial_start_date":null,"deal_momentum":"stalled","notes":"Dormant"},
    {"org_name":"FrieslandCampina","org_lifecycle_stage":"trial_expired","deal_value":null,"sales_poc":"Satish","region":"EMEA","domain":"AF&B","prospect_source":"cold_outreach","demo_date":null,"trial_start_date":null,"deal_momentum":"stalled","notes":"Dormant"},
    {"org_name":"LAC Intermarketing","org_lifecycle_stage":"trial_expired","deal_value":null,"sales_poc":"Satish","region":"Americas","domain":"NEO","prospect_source":"cold_outreach","demo_date":null,"trial_start_date":null,"deal_momentum":"stalled","notes":"Dormant"},
    {"org_name":"Logic Consulting","org_lifecycle_stage":"trial_expired","deal_value":null,"sales_poc":"Satish","region":"MEA","domain":"NEO","prospect_source":"cold_outreach","demo_date":null,"trial_start_date":null,"deal_momentum":"stalled","notes":"Dormant"},
    {"org_name":"Saint-Gobain","org_lifecycle_stage":"trial_expired","deal_value":null,"sales_poc":"Kartheek","region":"APAC","domain":"NEO","prospect_source":"cold_outreach","demo_date":null,"trial_start_date":null,"deal_momentum":"stalled","notes":"Dormant"},
    {"org_name":"Zoppas","org_lifecycle_stage":"trial_expired","deal_value":null,"sales_poc":"Satish","region":"EMEA","domain":"NEO","prospect_source":"cold_outreach","demo_date":null,"trial_start_date":null,"deal_momentum":"stalled","notes":"Dormant"},
    {"org_name":"CO-RO A/S","org_lifecycle_stage":"trial_expired","deal_value":null,"sales_poc":"Satish","region":"EMEA","domain":"AF&B","prospect_source":"cold_outreach","demo_date":null,"trial_start_date":null,"deal_momentum":"stalled","notes":"Trial scheduled for Feb 9 - dormant"},
    {"org_name":"Medinistros SAS","org_lifecycle_stage":"trial_expired","deal_value":null,"sales_poc":"Nikita","region":"Americas","domain":"HC","prospect_source":"inbound","demo_date":null,"trial_start_date":null,"deal_momentum":"stalled","notes":"Inbound lead - no response"},
    {"org_name":"Uptime Institute","org_lifecycle_stage":"trial_expired","deal_value":null,"sales_poc":"Sudeshana","region":"Americas","domain":"TMT","prospect_source":"cold_outreach","demo_date":null,"trial_start_date":null,"deal_momentum":"stalled","notes":"Demo completed - awaiting trial usage"},
    {"org_name":"BP","org_lifecycle_stage":"lost","deal_value":null,"sales_poc":"Kartheek","region":"EMEA","domain":"E&C","prospect_source":"cold_outreach","demo_date":null,"trial_start_date":null,"deal_momentum":"at_risk","notes":"Lost - IT onboarding issues"},
    {"org_name":"BASF","org_lifecycle_stage":"lost","deal_value":null,"sales_poc":"Kartheek","region":"EMEA","domain":"E&C","prospect_source":"cold_outreach","demo_date":null,"trial_start_date":null,"deal_momentum":"at_risk","notes":"Lost - they have an AI tool of their own"},
    {"org_name":"Brinsa S.A.","org_lifecycle_stage":"lost","deal_value":null,"sales_poc":"Kartheek","region":"Americas","domain":"E&C","prospect_source":"cold_outreach","demo_date":null,"trial_start_date":null,"deal_momentum":"at_risk","notes":"Lost - no response"},
    {"org_name":"Trouw Nutrition","org_lifecycle_stage":"lost","deal_value":null,"sales_poc":"Kartheek","region":"EMEA","domain":"AF&B","prospect_source":"cold_outreach","demo_date":null,"trial_start_date":null,"deal_momentum":"at_risk","notes":"Lost - not interested in pursuing"},
    {"org_name":"NEOM","org_lifecycle_stage":"lost","deal_value":null,"sales_poc":"Kirandeep","region":"MEA","domain":"NEO","prospect_source":"cold_outreach","demo_date":null,"trial_start_date":null,"deal_momentum":"at_risk","notes":"Lost based on call on Jan 13"},
    {"org_name":"Givaudan","org_lifecycle_stage":"lost","deal_value":null,"sales_poc":"Kartheek","region":"EMEA","domain":"AF&B","prospect_source":"cold_outreach","demo_date":null,"trial_start_date":null,"deal_momentum":"at_risk","notes":"Lost - they have an AI tool of their own"},
    {"org_name":"FTI Consulting","org_lifecycle_stage":"lost","deal_value":null,"sales_poc":"Satish","region":"Global","domain":"NEO","prospect_source":"cold_outreach","demo_date":null,"trial_start_date":null,"deal_momentum":"at_risk","notes":"Lost - not keen to engage"},
    {"org_name":"GCC Makers","org_lifecycle_stage":"lost","deal_value":null,"sales_poc":"Sudeshana","region":"MEA","domain":"NEO","prospect_source":"cold_outreach","demo_date":null,"trial_start_date":null,"deal_momentum":"at_risk","notes":"Lost - budget after trial"},
    {"org_name":"Latvijas Finieris","org_lifecycle_stage":"lost","deal_value":null,"sales_poc":"Sudeshana","region":"EMEA","domain":"NEO","prospect_source":"cold_outreach","demo_date":null,"trial_start_date":null,"deal_momentum":"at_risk","notes":"Lost - not a fit for myRA"},
    {"org_name":"AM Capital","org_lifecycle_stage":"lost","deal_value":null,"sales_poc":"Kirandeep","region":"MEA","domain":"NEO","prospect_source":"cold_outreach","demo_date":null,"trial_start_date":null,"deal_momentum":"at_risk","notes":"Lost - budget"},
    {"org_name":"IO Partners","org_lifecycle_stage":"lost","deal_value":null,"sales_poc":"Nikita","region":"EMEA","domain":"NEO","prospect_source":"cold_outreach","demo_date":null,"trial_start_date":null,"deal_momentum":"at_risk","notes":"Lost - not a fit for myRA"},
    {"org_name":"Grant Thornton Africa","org_lifecycle_stage":"lost","deal_value":null,"sales_poc":"Satish","region":"MEA","domain":"NEO","prospect_source":"cold_outreach","demo_date":null,"trial_start_date":null,"deal_momentum":"at_risk","notes":"Lost - not keen to engage"},
    {"org_name":"Alfanar","org_lifecycle_stage":"lost","deal_value":null,"sales_poc":"Satish","region":"MEA","domain":"E&C","prospect_source":"cold_outreach","demo_date":null,"trial_start_date":null,"deal_momentum":"at_risk","notes":"Lost - not keen to engage"},
    {"org_name":"Yamaha Motors","org_lifecycle_stage":"lost","deal_value":null,"sales_poc":"Sudeshana","region":"APAC","domain":"AAD","prospect_source":"cold_outreach","demo_date":null,"trial_start_date":null,"deal_momentum":"at_risk","notes":"Lost - not a good fit"},
    {"org_name":"MBRF","org_lifecycle_stage":"lost","deal_value":null,"sales_poc":"Satish","region":"MEA","domain":"NEO","prospect_source":"cold_outreach","demo_date":null,"trial_start_date":null,"deal_momentum":"at_risk","notes":"Lost - not a good fit"},
    {"org_name":"Agrobest Group","org_lifecycle_stage":"lost","deal_value":null,"sales_poc":"Satish","region":"EMEA","domain":"AF&B","prospect_source":"cold_outreach","demo_date":null,"trial_start_date":null,"deal_momentum":"at_risk","notes":"Lost - budget"},
    {"org_name":"Italian Trade Agency","org_lifecycle_stage":"lost","deal_value":null,"sales_poc":"Satish","region":"EMEA","domain":"NEO","prospect_source":"cold_outreach","demo_date":null,"trial_start_date":null,"deal_momentum":"at_risk","notes":"Lost - not keen to use AI tools"},
    {"org_name":"Fassco International","org_lifecycle_stage":"lost","deal_value":null,"sales_poc":"Kirandeep","region":"MEA","domain":"NEO","prospect_source":"cold_outreach","demo_date":null,"trial_start_date":null,"deal_momentum":"at_risk","notes":"Lost"},
    {"org_name":"Focal Point KSA","org_lifecycle_stage":"lost","deal_value":null,"sales_poc":null,"region":"MEA","domain":"NEO","prospect_source":"cold_outreach","demo_date":null,"trial_start_date":null,"deal_momentum":"at_risk","notes":"Lost - not a fit for myRA"},
    {"org_name":"J K White Cement Works","org_lifecycle_stage":"lost","deal_value":null,"sales_poc":null,"region":"APAC","domain":"E&C","prospect_source":"cold_outreach","demo_date":null,"trial_start_date":null,"deal_momentum":"at_risk","notes":"Lost"},
    {"org_name":"Woodward","org_lifecycle_stage":"lost","deal_value":null,"sales_poc":null,"region":"Americas","domain":"AAD","prospect_source":"cold_outreach","demo_date":null,"trial_start_date":null,"deal_momentum":"at_risk","notes":"Lost"},
    {"org_name":"ABB","org_lifecycle_stage":"lost","deal_value":null,"sales_poc":"Sudeshana","region":"APAC","domain":"E&C","prospect_source":"cold_outreach","demo_date":null,"trial_start_date":null,"deal_momentum":"at_risk","notes":"Lost - not keen to engage"},
    {"org_name":"ENEOS","org_lifecycle_stage":"lost","deal_value":null,"sales_poc":"Satya","region":"APAC","domain":"E&C","prospect_source":"cold_outreach","demo_date":null,"trial_start_date":null,"deal_momentum":"at_risk","notes":"Lost - pushed to March, no progress"},
    {"org_name":"JK Cements","org_lifecycle_stage":"lost","deal_value":null,"sales_poc":"Satya","region":"APAC","domain":"E&C","prospect_source":"cold_outreach","demo_date":null,"trial_start_date":null,"deal_momentum":"at_risk","notes":"Lost"},
    {"org_name":"Awe Research","org_lifecycle_stage":"trial_expired","deal_value":null,"sales_poc":"Satish","region":"APAC","domain":"NEO","prospect_source":"cold_outreach","demo_date":null,"trial_start_date":null,"deal_momentum":"stalled","notes":"Not yet active"},
    {"org_name":"BASF (Satish)","org_lifecycle_stage":"trial_expired","deal_value":null,"sales_poc":"Satish","region":"EMEA","domain":"E&C","prospect_source":"cold_outreach","demo_date":null,"trial_start_date":null,"deal_momentum":"stalled","notes":"Trial to be rolled out later due to internal restructuring. Contact: isadora-gabriela.teixeira@basf.com"},
    {"org_name":"Transit DXB","org_lifecycle_stage":"trial_active","deal_value":null,"sales_poc":"Satish","region":"MEA","domain":"NEO","prospect_source":"cold_outreach","demo_date":null,"trial_start_date":null,"deal_momentum":"positive","notes":"Active trial user. Also in negotiation as strong prospect."},
    {"org_name":"Cleveland Clinic Abu Dhabi (CCAD)","org_lifecycle_stage":"negotiation","deal_value":null,"sales_poc":"Kirandeep","region":"MEA","domain":"HC","prospect_source":"cold_outreach","demo_date":null,"trial_start_date":null,"deal_momentum":"positive","notes":"Strong prospect"}
  ]
};

async function importOrganizations() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  console.log(`Importing ${jsonData.organizations.length} organizations...`);
  console.log('Expected counts:', jsonData.metadata.summary);

  // Transform data to match sync endpoint format
  const rows = jsonData.organizations.map(org => ({
    name: org.org_name,
    stage: org.org_lifecycle_stage, // Will be mapped by STAGE_MAPPING
    deal_value: org.deal_value,
    sales_poc: org.sales_poc,
    region: org.region,
    domain: org.domain,
    prospect_source: org.prospect_source,
    demo_date: org.demo_date,
    trial_start_date: org.trial_start_date,
    deal_momentum: org.deal_momentum,
    notes: org.notes,
  }));

  try {
    const response = await fetch(`${baseUrl}/api/gtm/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        rows,
        mode: 'merge', // Update existing, create new
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Import failed:', response.status, error);
      process.exit(1);
    }

    const result = await response.json();
    console.log('\n Import Results:');
    console.log(`  Created: ${result.result.created}`);
    console.log(`  Updated: ${result.result.updated}`);
    console.log(`  Skipped: ${result.result.skipped}`);

    if (result.result.errors.length > 0) {
      console.log(`\n Errors (${result.result.errors.length}):`);
      result.result.errors.slice(0, 10).forEach((err: { row: number; error: string }) => {
        console.log(`    Row ${err.row}: ${err.error}`);
      });
      if (result.result.errors.length > 10) {
        console.log(`    ... and ${result.result.errors.length - 10} more`);
      }
    }

    console.log('\n', result.message);
  } catch (error) {
    console.error('Import error:', error);
    process.exit(1);
  }
}

importOrganizations();
