//--------  https://stackoverflow.com/questions/18796221/creating-a-select-box-with-a-search-option
var prefix = window.location.pathname.substr(0, window.location.pathname.toLowerCase().lastIndexOf("/extensions") + 1);

var config = {
	host: window.location.hostname,
	prefix: prefix,
	port: window.location.port,
	isSecure: window.location.protocol === "https:"
};

require.config({
	baseUrl: (config.isSecure ? "https://" : "http://") + config.host + (config.port ? ":" + config.port : "") + config.prefix + "resources"
});

async function getFieldDataArray(app,qlikFieldToBeUsed,qtdRowsPerPage,pageNumber=0){
	
	const dataSet=[];
	var listId=null;

	await app.createList({
		qDef: {
				qFieldDefs: [
					qlikFieldToBeUsed
				]
		},
		qInitialDataFetch: [
				{
						qTop:pageNumber*qtdRowsPerPage,
						qLeft:0,
						qHeight: qtdRowsPerPage,
						qWidth: 1
				}
		],
	},function(reply){

		listId=reply.qInfo.qId
		reply.qListObject.qDataPages[0].qMatrix.map((value)=>{
			dataSet.push(value[0].qText)
		});

	})
	
	app.destroySessionObject(listId)

	return dataSet;

}


async function getFieldDataArrayAll(app,qlikFieldToBeUsed){

	var dataSet=[]
	var newData=[]
	qtdRowsPerPage=1e4
	pageNumber=0
	do{
		newData= await getFieldDataArray(app,qlikFieldToBeUsed,qtdRowsPerPage,pageNumber)
		pageNumber=pageNumber+1
		dataSet=dataSet.concat(newData)
	}while(newData.length!=0);

	return dataSet;

}	

function insertLITemplate(array,inputTemplate,ulTemplate,app,qlikFieldName){

	array.forEach((value)=>{

		const li = document.createElement('li')
		li.innerHTML=value
		li.addEventListener('click',(event)=>{
			inputTemplate.value=value
			app.field(qlikFieldName).selectValues([{qText:value}],false,true)
		})

		ulTemplate.appendChild(li)
	})

}

async function generateFilterPane(app){

	const elementTemplate=`
		<input type="text">
		<ul class='customFilterDataPane_ul'></ul>
	`;

	const qtdRowsPerPage=20
	let pageNumber=0

	document.querySelectorAll('.customFilterDataPane').forEach(async (filterPane)=>{
		
		filterPane.innerHTML=elementTemplate;
		console.log(filterPane)
		const ulTemplate	= filterPane.querySelector('ul');
		ulTemplate.style.display='none'
		const inputTemplate	= filterPane.querySelector('input');

		const qlikFieldName = filterPane.getAttribute('data-column')
		const fullDataArray = await getFieldDataArrayAll(app,qlikFieldName);
		
		let filteredDataArray=fullDataArray;

		insertLITemplate(fullDataArray.slice(0,qtdRowsPerPage),inputTemplate,ulTemplate,app,qlikFieldName
		)

		inputTemplate.addEventListener('input',(event)=>{

			//clean UL
			ulTemplate.innerHTML=''

			filteredDataArray=fullDataArray.filter((value)=>{
				return value.toLowerCase().includes(event.target.value.toLowerCase())
			})

			insertLITemplate(filteredDataArray.slice(0,qtdRowsPerPage),inputTemplate,ulTemplate,app,qlikFieldName)
			
		})

		//Hide/show options
		inputTemplate.addEventListener('click',(event)=>{
			ulTemplate.style.display= (ulTemplate.style.display=='block') ? 'none' : 'block'
		})


		//variable control if can load more data
		let canLoad=true;

		ulTemplate.addEventListener('scroll',async (event)=>{
			const ulSize=ulTemplate.scrollHeight - ulTemplate.clientHeight

			if(event.target.scrollTop/ulSize>0.9 && canLoad){
				canLoad=false;
				pageNumber=pageNumber+1;
				insertLITemplate(filteredDataArray.slice(qtdRowsPerPage*pageNumber,qtdRowsPerPage*(pageNumber+1)),inputTemplate,ulTemplate,app,qlikFieldName)
				canLoad=true;
			}
			
		})
	})

}

require(["js/qlik"],  function (qlik) {

	// open the app
	var app = qlik.openApp('Sales Discovery.qvf', config);

	app.getObject('minhaDivi','SqDbku')

	generateFilterPane(app);

});

