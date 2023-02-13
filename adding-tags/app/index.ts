import fetch from "node-fetch"
import {
	AutomationEvent,
	AutomationInterface,
	AutomationMetadata
} from "../sdk"


const API_BASE = 'https://api.dev.devrev-eng.ai/';

export class App implements AutomationInterface {
    //Getting metadata for the Snap-in
	GetMetadata(): AutomationMetadata {
		return {
			name: "E2E SnapIn to automatically Add tags to tickets",
			version: "0.1"
		}
	}
    //main runner function
	async Run(events: AutomationEvent[]) {
		console.log("E2E SnapIn to automatically Add tags to tickets");
		await this.EventListener(events[0]);
	}

    // Function to create tags not present and add them to ticket
	async addTags(tagsCreateMethod: string, addTagsMethod: string , tags: string[], tagsList, authorization: string, ticketID: string) {

        const urlToAddTags = API_BASE + addTagsMethod;
        const urlToCreateTag = API_BASE + tagsCreateMethod;
        let tagIDList:string[] = []

        // Checking if a tag is present if yes save its id otherwise create a new tag and then save its id
        for(let i=0; i<tags.length;i++)
        {
            if(tagsList.has(tags[i]))
            {
                tagIDList.push(tagsList.get(tags[i]));
                continue;
            }
            else
            {
                let tagData = {
                    name : tags[i]
                }

                const tagCreated = await fetch(urlToCreateTag, {
                    method: 'POST',
                    headers: {
                        authorization,
                        "content-type": "application/json",
                        },
                    body: JSON.stringify(tagData),
                    
                });
                console.log(tagCreated)
                tagIDList.push((tagCreated.text()).id);
            }
        }

        let data:Object[] = [];

        data.push({"id": tagIDList[0]})
        
        for(let i=1; i<tagIDList.length; i++)
        {
            data.push({
                id: tagIDList[i]
            })
        }
        
        // Creating the JSON for adding tags
        let tagAddJSON = {
            "id": ticketID,
            "type": "ticket",
            "tags":{
                "set": data,
            }
        }
        
		const resp = await fetch(urlToAddTags, {
			method: 'POST',
			headers: {
				authorization,
				"content-type": "application/json",
			},
			body: JSON.stringify(tagAddJSON),
		});
		return resp;
	}

    // Getting the tags list already existing to compare them with the tags we need to create
	async getTagsList(method: string, token: string) {


		var requestOptions = {
			method: 'GET',
			headers: {
				Authorization: token
			},
			//redirect: 'follow'
		};

		let params = {
			"limit": 100,
		};

		let query = Object.keys(params)
			.map(k => encodeURIComponent(k) + '=' + encodeURIComponent(params[k]))
			.join('&');

		let url = API_BASE + method + '?' + query;

		const tagsList = await fetch(url, requestOptions)
			.then((response) => (response.json()))
			.then((response) => {
                let map = new Map();
                let result = (response);
				for (let i = 0; i < (result.tags).length; i++) {
					// saving both name and id of the tags in a map
					map.set(result.tags[i].name, result.tags[i].id)
				}
				return map;
			})
			.catch(error => console.log('error', error));
            console.log(tagsList)
		return tagsList;

	}

    // Extracting title and body of the created ticket, concatenating them and return them as a string array word wise
    async getTicketDetails(method: string, ticketID: string, token: string){
        var requestOptions = {
            method: 'GET',
			headers: {
				Authorization: token
			},
			//redirect: 'follow'
        };

        let params = {
            id: ticketID,
        };

        let query = Object.keys(params)
            .map(k => encodeURIComponent(k) + '=' + encodeURIComponent(params[k]))
            .join('&');

        let url = API_BASE + method + '?' + query;

        let ticketDetails = await fetch(url, requestOptions)
            .then((response) => {
                return response.json()
            })
            .then((result) => {
                let data = (result)
                console.log(data.work.title + " " +data.work.body)
                return data.work.title + " " + data.work.body
            })
            .catch(error => console.log('error', error));
            console.log(ticketDetails);
        return ticketDetails.split(" ");
    }

    // Main EventListener
	async EventListener(event: AutomationEvent) {

		const s = JSON.stringify(event.payload);
		console.log(`Checking and creating (if needed) tags for ticket creation event!`, s);

		// To get the Work Type
		const workType = event.payload.work_created.work.type;

		// IDs
		const ticketID = event.payload.work_created.work.id;

		// Routes
		const ticketDetailsAPIMethodPath = 'works.get';
		const tagsListAPIMethodPath = 'tags.list';
        const tagsCreateAPIMethodPath = 'tags.create';
        const addTagsAPIMethodPath = 'works.update';

        const globals = event.input_data.global_values;

		const devrevToken = event.input_data.keyrings["devrev"];
		let ticketDetails : string[] = [];
        if(workType == "ticket"){

            // Fetching title string from ticket using ticket id
            try {
                ticketDetails = await this.getTicketDetails(ticketDetailsAPIMethodPath, ticketID, devrevToken);
                

            } catch (error) {
                console.error('Error: ', error);
            }
            
            try {

                if (ticketDetails.length != 0) {

                // Get tags list
                const tagList = await this.getTagsList(tagsListAPIMethodPath, devrevToken);
                
                // const data = await fetch('../tags.json')
                //     .then((response) => {
                //         return response.json()
                //     });

                

                // const data = {
                //     "flow" : "flow",
                //     "ui": "ui"
                // }

                const keywordsJSON = globals.keywords_list;
                const data = JSON.parse(keywordsJSON)
                let keywords = Object.keys(data)
                let tagsToBeAdded: string[] = []; 

                // Looking for keywords in the title and description of the ticket
                for(let i = 0; i<keywords.length; i++)
                {
                    for(let j = 0; j<ticketDetails.length; j++)
                    {
                        if(keywords[i].toLowerCase() == ticketDetails[j].toLowerCase())
                        {
                            tagsToBeAdded.push(data[keywords[i]]);
                        }
                    }
                }

                // Adding the tags corresponding to the keywords 
                const resp = await this.addTags(tagsCreateAPIMethodPath, addTagsAPIMethodPath, tagsToBeAdded, tagList, devrevToken, ticketID);

                if (resp.ok) {
                    console.log("Successfully added tags.");
                } else {
                    let body = await resp.text();
                    console.error("Error while adding tags: ", resp.status, body);
                }
                }

            } catch (error) {
                console.error('Error: ', error);
            }
        }
	}
}