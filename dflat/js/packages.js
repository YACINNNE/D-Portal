// Copyright (c) 2019 International Aid Transparency Initiative (IATI)
// Licensed under the MIT license whose full text can be found at http://opensource.org/licenses/MIT

var packages=exports;

var util=require("util")
var path=require("path")
var ls=function(a) { console.log(util.inspect(a,{depth:null})); }

var fse=require("fs-extra")
var stringify = require('json-stable-stringify');

var request=require('request');

var fs=require("fs")
var pfs=require("pify")( require("fs") )
var dflat=require("./dflat.js")
var jml=require("./jml.js")
var xson=require("./xson.js")

// I promise to turn a url into data
var getbody=require("pify")( function(url,cb)
{
	request(url, function (error, response, body) {
		if(error) { cb(error,null); }
		else      { cb(null,body);  }
	});
} );


packages.prepare_download=async function(argv)
{
	if( argv.source=="datastore")
	{
		await packages.prepare_download_datastore(argv)
	}
	else
	{
		await packages.prepare_download_registry(argv)
	}
}

packages.prepare_download_common=async function(argv)
{

	argv.dir_downloads  = path.join(argv.dir,"downloads")
	argv.dir_packages   = path.join(argv.dir,"packages")
	argv.dir_publishers = path.join(argv.dir,"publishers")
	argv.dir_countries  = path.join(argv.dir,"countries")
	argv.dir_activities = path.join(argv.dir,"activities")

	await fse.emptyDir(argv.dir) // create output directories
	await fse.emptyDir(argv.dir_downloads)
	await fse.emptyDir(argv.dir_packages)
	await fse.emptyDir(argv.dir_publishers)
	await fse.emptyDir(argv.dir_countries)
	await fse.emptyDir(argv.dir_activities)

}

packages.prepare_download_common_downloads=async function(argv,downloads)
{
	downloads.sort(function(a,b){
		if (a.slug < b.slug) { return -1 }
		if (a.slug > b.slug) { return  1 }
		return 0
	})
	await fse.writeFile( path.join(argv.dir,"downloads.json") , stringify( downloads , {space:" "} ) )

	var txt=[]
	var curl=[]
//	var badcurl=[]
	for(var idx in downloads)
	{
		var it=downloads[idx]
		
		txt.push(it.slug+" "+it.url+"\n")

		curl.push("echo Downloading "+it.slug+" : "+it.url+" | tee downloads/"+it.slug+".log ; curl -s -S -A \"Mozilla/5.0\" --fail --retry 4 --retry-delay 10 --speed-time 30 --speed-limit 1000 -k -L -o downloads/"+it.slug+".xml \""+it.url+"\" 2>&1 >/dev/null | tee -a downloads/"+it.slug+".log\n")

//		badcurl.push("curl -o "+it.slug+".xml \""+it.url+"\" \n")
	}
	await fse.writeFile( path.join(argv.dir,"downloads.txt") , txt.join("") )
	await fse.writeFile( path.join(argv.dir,"downloads.curl") , curl.join("") )
//	await fse.writeFile( path.join(argv.dir,"downloads.badcurl") , badcurl.join("") )



	var txt=[]
	var parse=[]
	for(var idx in downloads)
	{
		var it=downloads[idx]
		
		txt.push(it.slug+"\n")

		parse.push("echo Parsing "+it.slug+" | tee packages/"+it.slug+".log ; node "+argv.filename_dflat+" --dir . packages "+it.slug+" 2>&1 | tee -a packages/"+it.slug+".log\n")
	}
	await fse.writeFile( path.join(argv.dir,"packages.txt") , parse.join("") )
	await fse.writeFile( path.join(argv.dir,"packages.parse") , parse.join("") )



	await fse.writeFile( path.join(argv.dir,"downloads.sh") ,
`
cd \`dirname $0\`

if [ "$1" = "debug" ] ; then
	bash downloads.curl
else
	cat downloads.curl | sort -R | parallel -j 0 --bar
fi

cat downloads/*.log >downloads.curl.log

`)
	await fse.chmod(     path.join(argv.dir,"downloads.sh") , 0o755 )


	await fse.writeFile( path.join(argv.dir,"packages.sh") ,
`
cd \`dirname $0\`

if [ "$1" = "debug" ] ; then
	bash packages.parse
else
	cat packages.parse | sort -R | parallel -j 0 --bar
fi

cat packages/*.log >packages.parse.log

`)
	await fse.chmod(     path.join(argv.dir,"packages.sh") , 0o755 )


	console.log(
`
You may now run the bash scripts in \"`+argv.dir+`\" to download and parse packages.

Please make sure you also have curl and parallel installed and available to these scripts.
`)

}



packages.prepare_download_datastore=async function(argv)
{
	console.log("Preparing \""+argv.dir+"\" directory to fetch upto "+argv.limit+" IATI packages from the datastore.")
	
	await packages.prepare_download_common(argv)

	var limit=20
	if(argv.limit<limit) { limit=argv.limit }
	
	var total=0
	var page=1
	
	var results=[]

	while( total < argv.limit )
	{
		process.stdout.write(".");

		var body=JSON.parse( await getbody("https://datastore.iati.cloud/api/datasets/?format=json&page_size="+limit+"&page="+page) )

// end of list
		if( !body.results ) { break }
		
		results=results.concat(body.results)
		
		total += limit
		page  += 1
	}
	process.stdout.write("\n");
	await fse.writeFile( path.join(argv.dir,"packages.datastore.json") , stringify( results , {space:" "} ) )

	console.log("Found "+results.length+" packages.")

// skim the junk
	var downloads=[]
	for(var idx in results)
	{
		var result=results[idx]
		var slug=result.name
		var url="https://datastore.iati.cloud/api/activities/?format=xml&fields=all&dataset="+result.id+"&page_size=20page=1"
		
		downloads.push( {slug:slug,url:url} )
	}

	await packages.prepare_download_common_downloads(argv,downloads)

}



packages.prepare_download_registry=async function(argv)
{
	console.log("Preparing \""+argv.dir+"\" directory to fetch upto "+argv.limit+" IATI packages via the registry.")
	
	await packages.prepare_download_common(argv)
	

	var limit=1000	
	if(argv.limit<limit) { limit=argv.limit }
	
	var total=0
	
	var results=[]

	while( total < argv.limit )
	{
		process.stdout.write(".");

		var body=JSON.parse( await getbody("https://iatiregistry.org/api/3/action/package_search?rows="+limit+"&start="+total) )

// end of list
		if( body.result.results.length == 0 ) { break }

		results=results.concat(body.result.results)
		
		total += limit
	}
	process.stdout.write("\n");
	await fse.writeFile( path.join(argv.dir,"packages.registry.json") , stringify( results , {space:" "} ) )

	console.log("Found "+results.length+" packages.")

// skim the junk
	var downloads=[]
	for(var idx in results)
	{
		var result=results[idx]
		var slug=result.name
		var url=result.resources[0].url
		
		downloads.push( {slug:slug,url:url} )
	}

	await packages.prepare_download_common_downloads(argv,downloads)
}

packages.process_download_save=async function(argv,json,filename)
{
	await pfs.writeFile( filename+".json" ,stringify(json,{space:" "}));

	var stats = xson.xpath_stats(json)
	await pfs.writeFile( filename+".stats.json" ,stringify(stats,{space:" "}));

	var xjml=xson.to_jml(json)
	var xml=jml.to_xml( xjml )
	await pfs.writeFile( filename+".xml" ,xml);

	if( json["/iati-activities/iati-activity"] )
	{
		var csv=dflat.xson_to_xsv(json,"/iati-activities/iati-activity",{"/iati-activities/iati-activity":true})
		await pfs.writeFile( filename+".csv" ,csv);
	}
	else
	if( json["/iati-organisations/iati-organisation"] )
	{
		var csv=dflat.xson_to_xsv(json,"/iati-organisations/iati-organisation",{"/iati-organisations/iati-organisation":true})
		await pfs.writeFile( filename+".csv" ,csv);
	}
}

packages.process_download=async function(argv)
{
	var slug=argv._[1]
		
	var downloaded_filename=path.join(argv.dir,"downloads/"+slug+".xml")
	
	if( ! fs.existsSync( downloaded_filename ) )
	{
		console.log( "input file does not exist "+downloaded_filename )
		return
	}

	console.log( "processing "+downloaded_filename )
	
	var dat=await pfs.readFile( downloaded_filename ,{ encoding: 'utf8' });
	var json=dflat.xml_to_xson(dat)
	
	dflat.clean(json) // we want cleaned up data
	
	var basename=path.join(argv.dir,"packages/"+slug)
	await packages.process_download_save( argv , json , basename )

// if we got some activities, spit them out individually
	if( json["/iati-activities/iati-activity"] )
	{
		await fse.emptyDir(basename)
		for( const act of json["/iati-activities/iati-activity"] )
		{
			var aid=dflat.saneid( act["/iati-identifier"] )
			await packages.process_download_save( argv , { "/iati-activities/iati-activity":[act] } , basename+"/"+aid )
		}
	}
}
