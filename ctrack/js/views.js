// Copyright (c) 2014 International Aid Transparency Initiative (IATI)
// Licensed under the MIT license whose full text can be found at http://opensource.org/licenses/MIT


var views=exports;

var ctrack=require("./ctrack.js")
var plate=require("./plate.js")
var iati=require("./iati.js")
var fetch=require("./fetch.js")

// include all view code

views.ended=require("./view_ended.js");
views.planned=require("./view_planned.js");
views.active=require("./view_active.js");
views.stats=require("./view_stats.js");
views.heatmap=require("./view_heatmap.js");

views.main=require("./view_main.js");

views.donors_top=require("./view_donors_top.js");
views.donors=require("./view_donors.js");
views.donor_transactions=require("./view_donor_transactions.js");
views.donor_budgets=require("./view_donor_budgets.js");
views.donor_activities=require("./view_donor_activities.js");

views.sectors_top=require("./view_sectors_top.js");
views.sectors=require("./view_sectors.js");
views.sector_transactions=require("./view_sector_transactions.js");
views.sector_budgets=require("./view_sector_budgets.js");
views.sector_activities=require("./view_sector_activities.js");

views.districts=require("./view_districts.js");

views.act=require("./view_act.js");

views.test=require("./view_test.js");

views.data_quality=require("./view_data_quality.js");
views.total=require("./view_total.js");
views.publishers=require("./view_publishers.js");

views.list_activities=require("./view_list_activities.js");
views.list_transactions=require("./view_list_transactions.js");
views.list_budgets=require("./view_list_budgets.js");
views.list_publishers=require("./view_list_publishers.js");
