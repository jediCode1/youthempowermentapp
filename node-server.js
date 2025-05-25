import path from 'path'
import { fileURLToPath } from 'url'
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
import http from 'http'
const bodyparser = import("body-parser")
const mv = import("mv")
const moveFile = import("move-file")
import {Server} from 'socket.io'
const uri = "mongodb://localhost:27017"
import upload from 'express-fileupload'
const fs = import('fs')

import { MongoClient } from 'mongodb'
 
 // Enable command monitoring for debugging
const mongoClient = new MongoClient('mongodb+srv://shopmatesales:N6Npa7vcMIaBULIS@cluster0.mgv7t.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0', { monitorCommands: true });
mongoClient.connect()// Enable command monitoring for debugging


//server calls management

import express from 'express'

const app = express()
app.use(express.json({limit:"1mb"}));
app.use(upload());
app.use(express.static(__dirname));
app.use(express.static(__dirname+'/Images'));
app.use(express.static(__dirname+'/Assets'));

const server = http.createServer(app)

const port = process.env.port || 1994

const ss = import('socket.io-stream')

const io = new Server(server)


//Date and time
let currentDate;
let currentMonth;
let currentMonthString;
let currentYear;
let currentHours;
let currentMins;

async function allocateTime(){
	
	let date = new Date()
	
	let months = ["January", "February", "March", "April" , "May" , "June" , "July" , "August" , "September" , "October" , "November" , "December"]
	
	currentDate = date.getDate();
	currentMonth = date.getMonth();
	currentYear = date.getFullYear();
	currentMonthString = months[currentMonth];
	currentHours = date.getHours();
	currentMins = date.getMinutes();
	
}

allocateTime()

let serverTime = {
	"date":currentDate,
	"month":currentMonth,
	"year":currentYear,
	"hours":currentHours,
	"mins":currentMins
};

let dayTrack = 0

async function EvaluateStories(dayTrack){
	
	try{
		
		let getStoryPosts = await mongoClient.db("YEMPData").collection("MainData").findOne({"name":"story-posts"})
		let storyPosts = getStoryPosts.body;
		function deleteStory(index,data){
			
			let output;
			
			if(data.archived == false){
				storyPosts.splice(index,1)
				//deletion of physical data
				let basics = data.basicDetails
				
				let ownerId = basics.ownerId
				
				let businessStory = basics.businessStory
				
				let videos = data.videos
				let images = data.images
				
				for(var i=0; i<videos.length ; i++){
					let it = videos[i]
					if(businessStory != true){
						fs.deleteFileSync(__dirname+`/User Data/${ownerId}/Videos/${it.id}.${it.format}`)
					}else{
						fs.deleteFileSync(__dirname+`/User Data/${ownerId}/Businesses/${it.businessId}/Videos/${it.id}.${it.format}`)
					}
				}
				
				for(var i=0; i<images.length ; i++){
					let it = videos[i]
					if(businessStory != true){
						fs.deleteFileSync(__dirname+`/User Data/${ownerId}/Images/${it.id}.${it.format}`)
					}else{
						fs.deleteFileSync(__dirname+`/User Data/${ownerId}/Businesses/${it.businessId}/Images/${it.id}.${it.format}`)
					}
				}
				
			}else{
				storyPosts.splice(index,1)
				//No deletion of physical data
			}
			
			return output
			
		}
		for(var i=0; storyPosts.length; i++){
			
			let story = storyPosts[i]
			
			let basics = story.basicDetails
			
			let time = basics.timePosted;
			
			let date = time.date
			
			let hours = time.hours 
			
			let mins = time.mins 
			
			if(
				date > dayTrack &&
				hours >= serverTime.hours
			){
				if(
					hours == serverTime.hours &&
					mins >= serverTime.mins
				){
					deleteStory(i,story)
				}
			}
			
		}
		
		await mongoClient.db("YEMPData").collection("MainData").updateOne({"name":"story-posts"},{$set:{"body":storyPosts}})
		
	}catch{
		console.log("Error occurred in fetching and updating stories")
	}
	
}

async function timeProcessor(){
	
	allocateTime()
	
	serverTime["date"] = currentDate,
	serverTime["month"] = currentMonth,
	serverTime["year"] = currentYear,
	serverTime["hours"] = currentHours,
	serverTime["mins"] = currentMins
	
	let d1 = serverTime.date
	let m1 = serverTime.month
	let y1 = serverTime.year
	
	if(
		d1 != dayTrack
	){
		await EvaluateStories(dayTrack)
	}
	
	dayTrack = serverTime.date
	
}

setInterval(timeProcessor,1000)

async function getActiveUsers(){
    let output = null 
    
    try{
        
        let getSockets = await mongoClient.db("YEMPData").collection("MainData").findOne({"name":"user-sockets"})
        output = getSockets.body 
        
    }catch{
        output = null
    }
    
    
    return output
}

async function updateActiveSockets(sockets){
    try{
        await mongoClient.db("YEMPData").collection("MainData").updateOne({"name":"user-sockets"},{$set:{"body" : sockets}})
    }catch{
        console.log("An error occurred while processing user sockets")
    }
}

const activateUserSocket = async(userId)=>{
    let activeUsers = await getActiveUsers()
    let search = activeUsers.find((activeUsers)=>{
        return activeUsers.userId === userId
    })
    search.active = true
	
	transferSocket.emit("recieve-active-user",{
		"userId": search.userId
	})

    await updateActiveSockets(activeUsers)
}

const addUserSocket = async(userId)=>{
    let activeUsers = await getActiveUsers()
    let newObj = {
        "userId":null, 
        "postsSelected": [],
        "active": true,
        "mediaId": null,
        "mediaFormat": null,
        "currentConversation": null
    }
    
    activeUsers.push(newObj)
    
    await updateActiveSockets(activeUsers)
}

const getUserSocket = async(userId)=>{
    var output = null 
    
    let activeSockets = await getActiveUsers()
    
    let search = activeSockets.find((activeSockets)=>{
        return activeSockets.userId === userId
    })
    if(search){
        output = search
    }
    
    return output
}

const loginSocketFunction = async(userId)=>{
    let activeSockets = await getActiveUsers()
    
    let search = activeSockets.find((activeSockets)=>{
        return activeSockets.userId === userId
    })
    
    
    if(search){
        search.active = true
    }else{
        addUserSocket(userId) 
    }
    
    await updateActiveSockets(activeSockets)
}

const checkIfSocketActive = async(userId)=>{
    let output = false
    let activeSockets = await getActiveUsers()
    let search = activeSockets.find((activeSockets)=>{
        return activeSockets.userId === userId
    })
    
    
    if(search){
        if(search.active == true){
            output = true
        }
    }
    
    return output
}

let transferSocket = null

let liveFeeds = []

let purchaseRequests = []

io.on("connection", (socket)=>{
	
	console.log("connected")
	transferSocket = socket
	/*Sale window calls*/
	socket.on("send-purchase-request",async(data)=>{
	    let accessorId = data.accessorId 
	    let request = data.request
	    let socketCheck = await checkIfSocketActive(accessorId)
	    if(socketCheck == true){
	        let search = purchaseRequests.find((purchaseRequests)=>{
	            return purchaseRequests.buyerId === accessorId
	        })
	        if(!search){
	            purchaseRequests.push(request)
	        }else{
	            let index = purchaseRequests.findIndex((purchaseRequests)=>{
    	            return purchaseRequests.buyerId === accessorId
    	        })
    	        purchaseRequests[index] = request
	        }
	    }
	})
	
	
	socket.on("get-payment-request", async(data)=>{
	    let id = data.accessorId
	    let socketCheck = await checkIfSocketActive(id)
	    if(socketCheck == true){
	        let search = purchaseRequests.find((purchaseRequests)=>{
	            return purchaseRequests.buyerId === id
	        })
	        socket.emit("recieve-payment-request",{
	            "accessorId":id,
	            "data": search
	        })
	    }
	})
	
	socket.on("send-cash-transfer-status",(data)=>{
	    socket.emit("recieve-cash-transfer-status",data)
	})
	
	////////////<Video Call Requests>////////////
	
	socket.on("init-video-call",async(data)=>{
	    data.incomingCall = true
	    socket.emit("recieve-video-call",data)
    })
	
    socket.on("init-audio-call",async(data)=>{
        data.incomingCall = true
	    socket.emit("recieve-audio-call",data)
	})
	
	socket.on("connect-to-call",(data)=>{
	    socket.emit("confirm-call-connect",data)
	})
	
	socket.on("send-end-call",(data)=>{
	    if(data.call == true){
	        socket.emit("end-audio-call",data)
	    }else{
	        socket.emit("end-video-call",data)
	    }
	}
	
	
	
	////////////<Video Call Requests>////////////
	
	//Shipping and delivery requests broadcasts 
	socket.on("send-shipping-update-broadcast",(data)=>{
		socket("recieve-shipping-update-broadcast",data)
	})
	
	socket.on("send-delivery-update-broadcast",(data)=>{
		socket("recieve-delivery-update-broadcast",data)
	})
	
	//Comment events 
	socket.on("send-catalogue-deleted",(data)=>{
	    
	    //relay data 
	    socket.emit("recieve-catalogue-update",{
	        "info":data,
	        "update":"deleted"
	    })
	    
	})
	
	//Streaming events
	
	socket.on("broadcast-live-stream-data",async(data)=>{
		try{
			
			let gSockets = await mongoClient.db("YEMPData").collection("MainData").findOne({"name":"user-sockets"})
			let sockets = gSockets.body 
			let feedData = data.feedData
			
			liveFeeds.push(feedData)
			
		}catch{
			
		}
	})
	
	socket.on("check-broadcast-status",(data)=>{
		let userId = data.accessorId 
		let feedId = data.feedId
		
		let feed = liveFeeds.find((liveFeeds)=>{
			return liveFeeds.feedId === feedId
		})
		
		let status = feed.active
		
		socket.emit("recieve-broadcast-status",{
			"feedId": feedId,
			"status":status
		})
	})
	
	//internal socket EVENTS
	
	socket.on("emit-close-conversation",(data)=>{
		let accessorId = data.accessorId 
		let conversationId = data.conversationId
		socket.emit("close-convo",{
			"conversationId": conversationId,
			"reason":reason
		})
	})
	
	socket.on("register-current-conversation",async(data)=>{
		let accessorId = data.accessorId
		let recieverId = data.recieverId
		let conversationId = data.conversationId
		let getUsers = await mongoClient.db("YEMPData").collection("MainData").findOne({"name":"user-profiles"})
	    let users = getUsers.body 
		let getBusinesses = await mongoClient.db("YEMPData").collection("MainData").findOne({"name":"user-businesses"})
	    let businesses = getUsers.body 
		let getSockets = await mongoClient.db("YEMPData").collection("MainData").findOne({"name":"user-sockets"})
		let sockets = getSockets.body
		
		let search = sockets.find((sockets)=>{
			return sockets.accessorId === accessorId
		})
		
		let blockedStatus = false
		
		let recieverData1 = businesses.find((businesses)=>{
			return businesses.businessId === recieverId
		})
		let recieverData2 = users.find((users)=>{
			return users.userId === recieverId
		})
		if(recieverData2){
			let blockedBusinesses = recieverData2.preferences.blockedBusinesses
			let blockedUsers = recieverData2.preferences.blockedUsers
			
			if(blockedBusinesses.includes(accessorId) == true || blockedUsers.includes(accessorId) == true){
				blockedStatus = true
			}
		}
		if(recieverData1){			
			let blockedUsers = recieverData1.preferences.blockedUsers
			if(blockedUsers.includes(accessorId) == true){
				blockedStatus = true
			}
		}
		if(search){
			if(blockedStatus == false){
				search.currentConversation = conversationId
				await mongoClient.db("YEMPData").collection("MainData").updateOne({"name":"user-sockets"},{$set:{"body":sockets}})
				socket.emit("conversation-entered",{
					"accessorId": accessorId,
					"recieverId":recieverId
				})
			}else{
				socket.emit("close-convo",{
					"conversationId": conversationId,
					"reason":"blocked"
				})
			}
		}else{
			socket.emit("close-convo",{
				"conversationId": conversationId,
				"reason":"user-non-existent"
			})
		}
	})
	
	socket.on("check-user-active", async(data)=>{
		let accessorId = data.accessorId
		let userId = data.userId 
		let getSockets = await mongoClient.db("YEMPData").collection("MainData").findOne({"name":"user-sockets"})
		let sockets = getSockets.body
		
		let search = sockets.find((sockets)=>{
			return sockets.userId === userId
		})
		
		if(search){
			socket.emit("user-active-status",{
				"accessorId": accessorId,
				"userId":userId,
				"active":search.active
			})
		}
		
	})
	
	socket.on("send-seen-messages",(data)=>{
		let userId = data.userId 
		let check = await checkIfSocketActive(userId)
		if(check == true){
			socket.emit("recieve-seen-messages",{
				"conversationId":data.conversationId,
				"messages":data.messages
			})
		}
	})
	
	socket.on("is-typing",(data)=>{
	    let senderId = data.senderId
	    let recieverId = data.recieverId
		let conversationId = data.conversationId
        socket.emit("recieve-typing-status" , {"senderId":senderId,"recieverId":recieverId,"conversationId":conversationId,"typing": true})
	}) 
	
	socket.on("stop-typing",(data)=>{
	    let senderId = data.senderId
	    let recieverId = data.recieverId
		let conversationId = data.conversationId
        socket.emit("recieve-typing-status" , {"senderId":senderId,"recieverId":recieverId,"conversationId":conversationId,"typing": false})
	})
	
	socket.on("send-notification", async(data)=>{
	    let notification = data.notification 
	    let userId = data.userId 
	    let businessId = data.businessId
	    let getUsers = await mongoClient.db("YEMPData").collection("MainData").findOne({"name":"user-profiles"})
	    let users = getUsers.body 
	    let user = users.find((users)=>{
	        return users.userId === userId
	    })
	    
	    if(!businessId){
	        
	        let friends = user.friends 
	        
	        for(var i=0; i<friends.length ; i++){
	            let friend = friends[i]
                let search = users.find((users)=>{
                    users.userId === friend
                })
                let notifications = search.notifications 
                
                notifications.push(notification)
	        }
	        
	        socket.emit("recieve-notifications",{
	            "userId": userId,
	            "notification": notifcation
	        })
	        
	    }else{
	        let friends = business.followers 
	        
	        for(var i=0; i<friends.length ; i++){
	            let friend = friends[i]
                let search = users.find((users)=>{
                    users.userId === friend
                })
                let notifications = search.notifications 
                
                notifications.push(notification)
	        }
	        if(data.alertVisitors){
				
				let visitors = business.visitors  
				
				for(var i=0; i<visitors.length ; i++){
					let friend = visitors[i].userId
					let search = users.find((users)=>{
						users.userId === friend
					})
					let notifications = search.notifications 
					
					notifications.push(notification)
				}
				
			}
	        socket.emit("recieve-business-notifications",{
	            "businessId": userId,
	            "notification": notification
	        })
	    }
	    
	    await mongoClient.db("YEMPData").collection("MainData").updateOne({"name":"user-profiles"},{$set:{"body":users}})
	    
	    
	})
	
	socket.on("log-on-user-admin", async(data)=>{
		
		let userId = data.userId
		
		let getAdminData = await mongoClient.db("YEMPData").collection("AdminOnlyInfo").findOne({"name":"admin-controller-data"})
		let adminData = getAdminData.body 
		
		let getSockets = await mongoClient.db("YEMPData").collection("MainData").findOne({"name":"user-sockets"});
		let sockets = getSockets.body 
		
		let search = sockets.find((sockets)=>{
			return sockets.userId === userId
		})
		
		if(search){
			if(search.active == true && search.alreadyLoggedIn == false){
				
				search.alreadyLoggedIn = true
				
				let newActive = adminData.activeUsers + 1
				
				adminData.activeUsers = newActive
				
				socket.emit("recieve-active-users",{
					"count": adminData.activeUsers
				})
				
			}
		}
		
		await mongoClient.db("YEMPData").collection("AdminOnlyInfo").updateOne({"name":"admin-controller-data"},{$set:{"body":adminData}})
		await mongoClient.db("YEMPData").collection("MainData").updateOne({"name":"user-sockets"},{$set:{"body":sockets}})
		
	})
	
	socket.on("delete-conversation-message",async(data)=>{
		
		let recieverId = data.recieverId
		let messageId = data.messageId
		let accessorId = data.accessor
		
		let getUsers = await mongoClient.db("YEMPData").collection("MainData").findOne({"name":"user-profiles"})
		let getBusinesses = await mongoClient.db("YEMPData").collection("MainData").findOne({"name":"user-businesses"})
	    let users = getUsers.body 
		let businesses = getBusinesses.body
		
		let user_x = users.find((users)=>{
			return users.userId === recieverId
		})
		let business_x = businesses.find((businesses)=>{
			return businesses.businessId == recieverId
		})
		
		let reciever = null
		
		if(user_x){
			reciever = user_x
		}else{
			reciever = business
		}
		
		let user;
		let user_y= users.find((users)=>{
	        return users.userId === accessorId
	    })
		let business_y = businesses.find((businesses)=>{
			return businesses.businessId == accessorId
		})
		
		let conversations = user.conversations 
	    
	    let conversation = conversations.find((conversations)=>{
	        conversations.id === id
	    }) 
		
		let messages1 = conversation.messages 
		
		let index2 = messages1.findIndex((messages1)=>{
			return messages1.id === messageId
		}) 
		
		conversation.messages.splice(index2,1)
		
		let conversations2 = reciever.conversations 
	    
	    let conversation2 = conversations2.find((conversations2)=>{
	        conversations2.id === id
	    }) 
		
		let messages = conversation2.messages 
		
		let index = messages.findIndex((messages)=>{
			return messages.id === messageId
		}) 
		
		conversation2.messages.splice(index,1)
		
		await mongoClient.db("YEMPData").collection("MainData").updateOne({"name":"user-profiles"},{$set:{"body":users}})
		if(business_x || business_y){
			await mongoClient.db("YEMPData").collection("MainData").updateOne({"name":"user-businesses"},{$set:{"body":businesses}})
		}
		
		socket.emit("recieve-fresh-conversation" , {
	        "senderId":userId, 
	        "recieverId":recieverId,
	        "conversation": conversation,
	        "conversation2": conversation2
	    })
		
	})
	
	socket.on("send-message", async(data)=>{
	    let userId = data.senderId
	    let recieverId = data.recieverId
		let senderType = data.senderType
	    let id = data.id
	    let getUsers = await mongoClient.db("YEMPData").collection("MainData").findOne({"name":"user-profiles"})
	    let users = getUsers.body 
	    let user = users.find((users)=>{
	        return users.userId === userId
	    })
	    let reciever = users.find((users)=>{
	        return users.userId === recieverId
	    })
	    let conversations = user.conversations 
	    
	    let conversation = conversations.find((conversations)=>{
	        conversations.id === id
	    }) 
	    
	    conversation.messages.push(data.message)
	    
	    let conversations2 = reciever.conversations 
	    
	    let conversation2 = conversations2.find((conversations2)=>{
	        conversations2.id === id
	    }) 
	    
	    conversation2.messages.push(data.message)
		
	    socket.emit("recieve-fresh-conversation" , {
	        "senderId":userId, 
	        "recieverId":recieverId,
	        "conversation": conversation,
	        "conversation2": conversation2
	    })
		
		socket.emit("recieve-sent-confirmation",{
			"senderId": userId, 
			"recieverId": recieverId,
			"messageId": data.message.id
		})
	    
	    await mongoClient.db("YEMPData").collection("MainData").updateOne({"name":"user-profiles"},{$set:{"body":users}})
	    
	})
	
	socket.on("disconnect manually" , (data)=>{
		deactivateUserSocket(data.userId)
		socket.emit("user-logof", {"userId" : id})
		socket.emit("recieve-typing-status" , {"userId":userId,"status":false})
	})
	
	socket.on("set-media-Id" , (data)=>{
	    
	    let userId = data.userId 
	    let format = data.format
	    let mediaId = data.mediaId
	    let ownerId = data.ownerId
	    let businessId = null 
	    if(data.businessId){ 
	        businessId = data.business
	    }
	    
	    
	    let socket = getUserSocket(userId)

        socket.mediaId = mediaId 
        socket.mediaFormat = format
        socket.ownerId = ownerId
        if(businessId){
            socket.businessId = businessId
        }
	    
	})
	
	//update user Data
	
	socket.on("updateUserData", async(data)=>{
		
		let accessorId = data.accessorId

		let check = await checkIfSocketActive(accessorId,true)
		
		//process updates

        if(check == true){
            try{
    		
        		let userId = data.userId
        		
        		let userData = data.userData
        		
        		let localDataSearch = locateSingleUser(userData.userId)
        		let localData = localDataSearch.index
        		let index = localDataSearch.data
        		
        		let sort = await processUserData(userData,localData,businessId)
        
                let process = await updateSingleUser(userId,sort.data2) 
        		
        		if(process == true){
        			
        			//find queue
        			socket.emit("recieveupdate", {"data":sort.data1, "userId": userId})
        			
        		}else{
        			socket.emit("updateError",{"message": "Error occurred in updating Business Data. Please try again later"})
        		}
    		
            }catch{
                socket.emit("updateError",{"message": "Error occurred in updating Business Data. Please try again later"})
            }
        }
		
		
		
	})
	
	//ping users  
	
	setInterval(async()=>{
		
		let activeUsers = await getActiveUsers()
		
		for(var i=0; i<activeUsers.length; i++){
			let user = activeUsers[i]
			user.status = false
			
		}
		
		await updateActiveSockets(activeUsers)
		socket.emit("ping")
	
	},15000)
	
	setInterval(async()=>{
		
		let list = []
		
		let activeUsers = await getActiveUsers()
		
		
		for(var i=0; i<activeUsers.length; i++){ 
			
			let user = activeUsers[i]
			if(user.status == false){
			    list.push(user)
			    socket.emit("recieve-typing-status" , {"userId":user.userId,"status":false})
			}
			
		}
		
		
		
		socket.emit("offline-users",{"data": list})
		
	},30000)
	
	socket.on("affirm",(data)=>{
		activateUserSocket(data.userId)
	});
	
	
	
	
	
})

/////////////////////////////////////////////////////////////*Post Data Helpers*///////////////////////////////////////////////////////////////////////////////////////

/*Locators*/

const GetUserData = async(userId)=>{
	let output;
	
	try{
		
		let getUsers = await mongoClient.db("YEMPData").collection("MainData").findOne({"name":"user-profiles"});
		
		let users = getUsers.body
		
		let user = users.find((users)=>{
			return users.userId === userId
		})
		
		output = user
		
	}catch{
		output = null
	}
	
	
	return output
}

const GetBusinessData = async(businessId)=>{
	
	let output;
	
	try{
		
		let getBusinesses = await mongoClient.db("YEMPData").collection("MainData").findOne({"name" : "user-businesses"});
		
		let businesses = getBusinesses.body
		
		let business = businesses.find((businesses)=>{
			return businesses.businessId === businessId
		})
		
		output = user
		
	}catch{
		output = null
	}
	
	
	return output
	
}

const GetUserRegion = async(user)=>{
	
	let details = user.addressDetails
	
	let output = {
		
		"country": details.country,
		"zipCode": details.zipCode,
		"districtRegionProvince": details.districtRegionProvince,
		"city": details.city
		
	};
	
	
	
	return output
}

/*Region Selectors*/

const GetPostsByRegion = async(feed,userId)=>{
	
	let output;
	
	try{
		
		//sort user posts 
		
		let userPosts = feed.userPosts
		let userPostsOut = []
		
		for(var i=0; i<userPosts.length; i++){
			
			let it = userPosts[i]
			let accessor = await GetUserData(userId)
			let address1 = GetUserRegion(accessor)
			let basics = userPosts[i].basicDetails;
			let ownerId = basics.ownerId
			let user = await GetUserData(ownerId)
			let address2 = GetUserRegion(user)
			
			let drp1 = address1.districtRegionProvince.toRegex()
			let c1 = address1.city.toRegex()
			
			if(
				address1.country === address2.country &&
				drp1.matches(address2.districtRegionProvince) &&
				InterestsEval(accessor,it) &&
				c1.matches(address2.city) ||
				address1.zipCode === address2.zipCode
			){
				userPostsOut.push(it)
			}
			
		}
		
		//sort video posts 
		
		let videoPosts = feed.videoPosts
		let videoPostsOut = []
		
		for(var i=0; i<videoPosts.length; i++){
			
			let it = videoPosts[i]
			let accessor = await GetUserData(userId)
			let address1 = GetUserRegion(accessor)
			let basics = videoPosts[i].basicDetails;
			let ownerId = basics.ownerId
			let user = await GetUserData(ownerId)
			let address2 = GetUserRegion(user)
			
			let drp1 = address1.districtRegionProvince.toRegex()
			let c1 = address1.city.toRegex()
			
			if(
				address1.country === address2.country &&
				drp1.matches(address2.districtRegionProvince) &&
				InterestsEval(accessor,it) &&
				c1.matches(address2.city) ||
				address1.zipCode === address2.zipCode
			){
				videoPostsOut.push(it)
			}
			
		}
		
		//sort group posts 
		
		let groupPosts = feed.groupPosts
		let groupPostsOut = []
		
		for(var i=0; i<groupPosts.length; i++){
			
			let it = groupPosts[i]
			let accessor = await GetUserData(userId)
			let address1 = GetUserRegion(accessor)
			let basics = groupPosts[i].basicDetails;
			let ownerId = basics.ownerId
			let user = await GetUserData(ownerId)
			let address2 = GetUserRegion(user)
			
			let drp1 = address1.districtRegionProvince.toRegex()
			let c1 = address1.city.toRegex()
			
			if(
				address1.country === address2.country &&
				drp1.matches(address2.districtRegionProvince) &&
				InterestsEval(accessor,it) &&
				c1.matches(address2.city) ||
				address1.zipCode === address2.zipCode
			){
				groupPostsOut.push(it)
			}
			
		}
		
		//sort topic posts 
		
		let topicPosts = feed.topicPosts
		let topicPostsOut = []
		
		for(var i=0; i<topicPosts.length; i++){
			
			let it = topicPosts[i]
			let accessor = await GetUserData(userId)
			let address1 = GetUserRegion(accessor)
			let basics = topicPosts[i].basicDetails;
			let ownerId = basics.ownerId
			let user = await GetUserData(ownerId)
			let address2 = GetUserRegion(user)
			
			let drp1 = address1.districtRegionProvince.toRegex()
			let c1 = address1.city.toRegex()
			
			if(
				address1.country === address2.country &&
				drp1.matches(address2.districtRegionProvince) &&
				InterestsEval(accessor,it) &&
				c1.matches(address2.city) ||
				address1.zipCode === address2.zipCode
			){
				topicPostsOut.push(it)
			}
			
		}
		
		//sort market place posts 
		
		let marketPlacePosts = feed.marketPlacePosts
		let marketPlacePostsOut = []
		
		for(var i=0; i<marketPlacePosts.length; i++){
			
			let it = marketPlacePosts[i]
			let accessor = await GetUserData(userId)
			let address1 = GetUserRegion(accessor)
			let basics = marketPlacePosts[i].basicDetails;
			let ownerId = basics.ownerId
			let user = await GetUserData(ownerId)
			let address2 = GetUserRegion(user)
			
			let drp1 = address1.districtRegionProvince.toRegex()
			let c1 = address1.city.toRegex()
			
			if(
				address1.country === address2.country &&
				drp1.matches(address2.districtRegionProvince) &&
				c1.matches(address2.city) ||
				address1.zipCode === address2.zipCode
			){
				marketPlacePostsOut.push(it)
			}
			
		}
		
		//sort story posts 
		
		let storyPosts = feed.storyPosts
		let storyPostsOut = []
		
		for(var i=0; i<storyPosts.length; i++){
			
			let it = storyPosts[i]
			let accessor = await GetUserData(userId)
			let address1 = GetUserRegion(accessor)
			let basics = storyPosts[i].basicDetails;
			let ownerId = basics.ownerId
			let user = await GetUserData(ownerId)
			let address2 = GetUserRegion(user)
			
			let drp1 = address1.districtRegionProvince.toRegex()
			let c1 = address1.city.toRegex()
			
			if(
				address1.country === address2.country &&
				drp1.matches(address2.districtRegionProvince) &&
				c1.matches(address2.city) ||
				address1.zipCode === address2.zipCode
			){
				storyPostsOut.push(it)
			}
			
		}
		
		output = {
			"businessPosts" : feed.businessPosts,
			"userPosts" : userPostsOut,
			"channelPosts" :  feed.channelPosts,
			"articles" : feed.articles,
			"videoPosts" : videoPostsOut,
			"storyPosts": storyPostsOut,
			"groupPosts" : groupPostsOut,
			"topicPosts" : topicPostsOut,
			"marketPlacePosts": marketPlacePostsOut
		}
		
	}catch{
		
		output = null
		
	}
	
	return output
	
}

const GetPostsByInterest = async(feed,data)=>{
	
	let output;
	
	try{
		
		//Get posts from other countries 
		
		//sort user posts 
		
		let userPosts = feed.userPosts
		let userPostsOut = []
		
		for(var i=0; i<userPosts.length; i++){
			
			let it = userPosts[i]
			let accessor = await GetUserData(userId)
			let address1 = GetUserRegion(accessor)
			let basics = userPosts[i].basicDetails;
			let ownerId = basics.ownerId
			let user = await GetUserData(ownerId)
			let address2 = GetUserRegion(user)
			
			if(
				address1.country != address2.country &&
				InterestsEval(accessor,it) == true
			){
				userPostsOut.push(it)
			}
			
		}
		
		let userPosts2 = data.userPosts
		for(var i=0; i<userPosts2.length; i++){
			let it = userPosts2[i]
			userPostsOut.push(it)
		}
		
		//sort video posts 
		
		let videoPosts = feed.videoPosts
		let videoPostsOut = []
		
		for(var i=0; i<videoPosts.length; i++){
			
			let it = videoPosts[i]
			let accessor = await GetUserData(userId)
			let address1 = GetUserRegion(accessor)
			let basics = videoPosts[i].basicDetails;
			let ownerId = basics.ownerId
			let user = await GetUserData(ownerId)
			let address2 = GetUserRegion(user)
			
			let drp1 = address1.districtRegionProvince.toRegex()
			let c1 = address1.city.toRegex()
			
			if(
				address1.country != address2.country &&
				InterestsEval(accessor,it) == true
			){
				videoPostsOut.push(it)
			}
			
		}
		
		let videoPosts2 = data.videoPosts
		for(var i=0; i<videoPosts2.length; i++){
			let it = videoPosts2[i]
			videoPostsOut.push(it)
		}
		
		//sort group posts 
		
		let groupPosts = feed.groupPosts
		let groupPostsOut = []
		
		for(var i=0; i<groupPosts.length; i++){
			
			let it = groupPosts[i]
			let accessor = await GetUserData(userId)
			let address1 = GetUserRegion(accessor)
			let basics = groupPosts[i].basicDetails;
			let ownerId = basics.ownerId
			let user = await GetUserData(ownerId)
			let address2 = GetUserRegion(user)
			
			let drp1 = address1.districtRegionProvince.toRegex()
			let c1 = address1.city.toRegex()
			
			if(
				address1.country != address2.country &&
				InterestsEval(accessor,it) == true
			){
				groupPostsOut.push(it)
			}
			
		}
		
		let groupPosts2 = data.groupPosts
		for(var i=0; i<groupPosts2.length; i++){
			let it = groupPosts2[i]
			groupPostsOut.push(it)
		}
		
		//sort topic posts 
		
		let topicPosts = feed.topicPosts
		let topicPostsOut = []
		
		for(var i=0; i<topicPosts.length; i++){
			
			let it = topicPosts[i]
			let accessor = await GetUserData(userId)
			let address1 = GetUserRegion(accessor)
			let basics = topicPosts[i].basicDetails;
			let ownerId = basics.ownerId
			let user = await GetUserData(ownerId)
			let address2 = GetUserRegion(user)
			
			let drp1 = address1.districtRegionProvince.toRegex()
			let c1 = address1.city.toRegex()
			
			if(
				address1.country != address2.country &&
				InterestsEval(accessor,it) == true
			){
				topicPostsOut.push(it)
			}
			
		}
		
		let topicPosts2 = data.topicPosts
		for(var i=0; i<topicPosts2.length; i++){
			let it = topicPosts2[i]
			topicPostsOut.push(it)
		}
		
		//sort market place posts 
		
		let marketPlacePosts = feed.marketPlacePosts
		let marketPlacePostsOut = []
		
		for(var i=0; i<marketPlacePosts.length; i++){
			
			let it = marketPlacePosts[i]
			let accessor = await GetUserData(userId)
			let address1 = GetUserRegion(accessor)
			let basics = marketPlacePosts[i].basicDetails;
			let ownerId = basics.ownerId
			let user = await GetUserData(ownerId)
			let address2 = GetUserRegion(user)
			
			let drp1 = address1.districtRegionProvince.toRegex()
			let c1 = address1.city.toRegex()
			
			if(
				address1.country != address2.country &&
				InterestsEval(accessor,it) == true
			){
				marketPlacePostsOut.push(it)
			}
			
		}
		
		let marketPlacePosts2 = data.marketPlacePosts
		for(var i=0; i<marketPlacePosts2.length; i++){
			let it = marketPlacePosts2[i]
			marketPlacePostsOut.push(it)
		}
		
		//sort story posts 
		
		let storyPosts = feed.storyPosts
		let storyPostsOut = []
		
		for(var i=0; i<storyPosts.length; i++){
			
			let it = storyPosts[i]
			let accessor = await GetUserData(userId)
			let address1 = GetUserRegion(accessor)
			let basics = storyPosts[i].basicDetails;
			let ownerId = basics.ownerId
			let user = await GetUserData(ownerId)
			let address2 = GetUserRegion(user)
			
			let drp1 = address1.districtRegionProvince.toRegex()
			let c1 = address1.city.toRegex()
			
			if(
				address1.country != address2.country &&
				ConnectionEval(accessor,user) == true
			){
				storyPostsOut.push(it)
			}
			
		}
		
		let storyPosts2 = data.storyPosts
		for(var i=0; i<storyPosts2.length; i++){
			let it = storyPosts2[i]
			storyPostsOut.push(it)
		}
		
		output = {
			"businessPosts" : feed.businessPosts,
			"userPosts" : userPostsOut,
			"channelPosts" :  feed.channelPosts,
			"articles" : feed.articles,
			"videoPosts" : videoPostsOut,
			"storyPosts": storyPostsOut,
			"groupPosts" : groupPostsOut,
			"topicPosts" : topicPostsOut,
			"marketPlacePosts": marketPlacePostsOut
		}
		
		
	}catch{
		output = null
	}
	
	return output
	
}

const TimePeriodProcessor = async(feed)=>{
	
	let output;
	
	try{
		
		//sort user posts 
		
		let userPosts = feed.userPosts
		let userPostsOut = []
		
		for(var i=0; i<userPosts.length; i++){
			
			let it = userPosts[i]
			
			let d1 = serverTime.date
			let m1 = serverTime.month
			let y1 = serverTime.year
			
			let postTime = it.basicDetails.timePosted 
			
			let d2 = postTime.date
			let m2 = postTime.month
			let y2 = postTime.year
			
			if(
				y1 == y2
			){
				userPostsOut.push(it)
			}else{
				if(
					y2 == (y1-1) &&
					m2 >= 10 
				){
					userPostsOut.push(it)
				}
			}
			
		}
		
		//sort video posts 
		
		let videoPosts = feed.videoPosts
		let videoPostsOut = []
		
		for(var i=0; i<videoPosts.length; i++){
			
			let it = videoPosts[i]
			let d1 = serverTime.date
			let m1 = serverTime.month
			let y1 = serverTime.year
			
			let postTime = it.basicDetails.timePosted 
			
			let d2 = postTime.date
			let m2 = postTime.month
			let y2 = postTime.year
			
			if(
				y1 == y2
			){
				videoPostsOut.push(it)
			}else{
				if(
					y2 == (y1-1) &&
					m2 >= 10 
				){
					videoPostsOut.push(it)
				}
			}
			
		}
		
		//sort group posts 
		
		let groupPosts = feed.groupPosts
		let groupPostsOut = []
		
		for(var i=0; i<groupPosts.length; i++){
			
			let it = groupPosts[i]
			let d1 = serverTime.date
			let m1 = serverTime.month
			let y1 = serverTime.year
			
			let postTime = it.basicDetails.timePosted 
			
			let d2 = postTime.date
			let m2 = postTime.month
			let y2 = postTime.year
			
			if(
				y1 == y2
			){
				groupPostsOut.push(it)
			}else{
				if(
					y2 == (y1-1) &&
					m2 >= 10 
				){
					groupPostsOut.push(it)
				}
			}
			
		}
		
		//sort topic posts 
		
		let topicPosts = feed.topicPosts
		let topicPostsOut = []
		
		for(var i=0; i<topicPosts.length; i++){
			
			let it = topicPosts[i]
			let d1 = serverTime.date
			let m1 = serverTime.month
			let y1 = serverTime.year
			
			let postTime = it.basicDetails.timePosted 
			
			let d2 = postTime.date
			let m2 = postTime.month
			let y2 = postTime.year
			
			if(
				y1 == y2
			){
				topicPostsOut.push(it)
			}else{
				if(
					y2 == (y1-1) &&
					m2 >= 10 
				){
					topicPostsOut.push(it)
				}
			}
			
		}
		
		//sort market place posts 
		
		let marketPlacePosts = feed.marketPlacePosts
		let marketPlacePostsOut = []
		
		for(var i=0; i<marketPlacePosts.length; i++){
			
			let it = marketPlacePosts[i]
			let d1 = serverTime.date
			let m1 = serverTime.month
			let y1 = serverTime.year
			
			let postTime = it.basicDetails.timePosted 
			
			let d2 = postTime.date
			let m2 = postTime.month
			let y2 = postTime.year
			
			if(
				y1 == y2
			){
				marketPlacePostsOut.push(it)
			}else{
				if(
					y2 == (y1-1) &&
					m2 >= 10 
				){
					marketPlacePostsOut.push(it)
				}
			}
			
		}
		
		//sort story posts 
		
		let storyPosts = feed.storyPosts
		let storyPostsOut = []
		
		for(var i=0; i<storyPosts.length; i++){
			
			let it = storyPosts[i]
			let d1 = serverTime.date
			let m1 = serverTime.month
			let y1 = serverTime.year
			
			let postTime = it.basicDetails.timePosted 
			
			let d2 = postTime.date
			let m2 = postTime.month
			let y2 = postTime.year
			
			if(
				y1 == y2
			){
				storyPostsOut.push(it)
			}else{
				if(
					y2 == (y1-1) &&
					m2 >= 10 
				){
					storyPostsOut.push(it)
				}
			}
			
			
		}
		
		//sort business posts 
		
		let businessPosts = feed.businessPosts
		let businessPostsOut = []
		
		for(var i=0; i<businessPosts.length; i++){
			
			let it = businessPosts[i]
			let d1 = serverTime.date
			let m1 = serverTime.month
			let y1 = serverTime.year
			
			let postTime = it.basicDetails.timePosted 
			
			let d2 = postTime.date
			let m2 = postTime.month
			let y2 = postTime.year
			
			if(
				y1 == y2
			){
				businessPostsOut.push(it)
			}else{
				if(
					y2 == (y1-1) &&
					m2 >= 10 
				){
					businessPostsOut.push(it)
				}
			}
			
			
		}
		
		
		//sort channel posts 
		
		let channelPosts = feed.channelPosts
		let channelPostsOut = []
		
		for(var i=0; i<channelPosts.length; i++){
			
			let it = channelPosts[i]
			let d1 = serverTime.date
			let m1 = serverTime.month
			let y1 = serverTime.year
			
			let postTime = it.basicDetails.timePosted 
			
			let d2 = postTime.date
			let m2 = postTime.month
			let y2 = postTime.year
			
			if(
				y1 == y2
			){
				channelPostsOut.push(it)
			}else{
				if(
					y2 == (y1-1) &&
					m2 >= 10 
				){
					channelPostsOut.push(it)
				}
			}
			
			
		}
		
		//sort articles posts 
		
		let articles = feed.articles
		let articlesOut = []
		
		for(var i=0; i<articles.length; i++){
			
			let it = articles[i]
			let d1 = serverTime.date
			let m1 = serverTime.month
			let y1 = serverTime.year
			
			let postTime = it.basicDetails.timePosted 
			
			let d2 = postTime.date
			let m2 = postTime.month
			let y2 = postTime.year
			
			if(
				y1 == y2
			){
				articlesOut.push(it)
			}else{
				if(
					y2 == (y1-1) &&
					m2 >= 10 
				){
					articlesOut.push(it)
				}
			}
			
			
		}
		
		
		
		
	}catch{
		output = null
	}
}

const InterestsProcessor = async(feed,userId)=>{
	
	let output;
	
	/*	
		*get posts from users within a similar area followed by country followed by other countries with similar interests
		*get posts from every connected user who have similar interests
		*get posts from every other user which suites user interests
		*get posts from every business which suites user interests
	*/
	
	/*Similar Area Posts*/
	let similar_area = await GetPostsByRegion(feed,userId);
	let posts_by_interest = await GetPostsByInterest(feed,similar_area);
	let process_business_posts_by_interest = await GetBizPostsByInterest(posts_by_interest)
	
	output = process_business_posts_by_interest
	
	return output 
	
}

/////////////////////////////////////////////////////////////*Post Data Helpers END*//////////////////////////////////////////////////////////////////////////////////

app.get("/process-payment",async(request,response)=>{
    try{
        response.sendFile(__dirname+"/paymentsection.html") 
    }catch{
        response.send(JSON.stringify({"status":"server-error"}))
    }
})

app.post("/get-posts-data", async(request,response)=>{
    
    try{
        
        let userId = request.body.userId
        
        let socketCheck = await checkIfSocketActive(userId) 
        
        if(socketCheck == true){
          
            var output = null  
              
            var getBusinessPosts = await mongoClient.db("YEMPData").collection("MainData").findOne({"name":"business-posts"}) 
            var getUserPosts = await mongoClient.db("YEMPData").collection("MainData").findOne({"name":"user-posts"})
            var getChannelPosts = await mongoClient.db("YEMPData").collection("MainData").findOne({"name":"channel-posts"})
            var getArticlePosts = await mongoClient.db("YEMPData").collection("MainData").findOne({"name":"article-posts"})
            var getVideoPosts = await mongoClient.db("YEMPData").collection("MainData").findOne({"name":"video-posts"})
            var getTopicPosts = await mongoClient.db("YEMPData").collection("MainData").findOne({"name":"topic-posts"})
            var getGroupPosts = await mongoClient.db("YEMPData").collection("MainData").findOne({"name":"group-posts"})
            var getStoryPosts = await mongoClient.db("YEMPData").collection("MainData").findOne({"name":"story-posts"})
            var getMarketPlacePosts = await mongoClient.db("YEMPData").collection("MainData").findOne({"name":"market-place-posts"})
            
            
            
            //extraction 
            let businessPosts = getBusinessPosts.body  
            let userPosts = getUserPosts.body
            let channelPosts = getChannelPosts.body
            let articles = getArticlePosts.body 
            let videoPosts = getVideoPosts.body
            let storyPosts = getStoryPosts.body
            let groupPosts = getGroupPosts.body
            let topicPosts = getTopicPosts.body
            let marketPlacePosts = getMarketPlacePosts.body
            
            let dataFeed = {
                "businessPosts" : businessPosts,
                "userPosts" : userPosts,
                "channelPosts" :  channelPosts,
                "articles" : articles,
                "videoPosts" : videoPosts,
                "storyPosts": storyPosts,
                "groupPosts" : groupPosts,
                "topicPosts" : topicPosts,
                "marketPlacePosts": marketPlacePosts
            }
            
            //Processes (in this order)
    
            let process_for_interests = await InterestsProcessor(dataFeed,userId)
			let process_for_dates = await TimePeriodProcessor(process_for_interests)
            let process_for_views_count = await ViewsProcessor(process_for_dates,userId)
            output = await process_for_views_count
            
			if(output){				
				response.send(JSON.stringify({"status":"success","data":output}))  
			}else{
				response.send(JSON.stringify({"status":"server-error"}))
			}
            
        }else{
            response.sendStatus(404)
        }
        
    }catch{
        
        response.send(JSON.stringify({"status":"server-error"}))
        
    }
    
})

const findSinglePosts = async(posts,mediaInfo)=>{
	let output = null 
	
	for(var i=0; i<posts.length; i++){
		
		let post = posts[i]
		let type = post.classType
		if(classType === "MediaPost"){
			if(
				it.id === mediaInfo.id &&
				it.format === mediaInfo.format &&
				it.type === mediaInfo.type 
			){
				output = post
			}
		}
		
	}
	
	return output
}

app.post("/get-media-post-data",async(request,response)=>{
	try{
		
		let data = request.body 
		let mediaInfo = data.mediaInfo 
		let accessorId = data.accessorId 
		
		let socketCheck = await checkIfSocketActive(accessorId)
		if(socketCheck == true){
			
			let getUserPosts = await mongoClient.db("YEMPData").collection("MainData").findOne({"name":"user-posts"})
			let posts = getUserPosts.body
			let post = await findSinglePosts(posts,mediaInfo)
			if(post){
				response.send(JSON.stringify({"status":"success","post":post}))
			}else{
				response.send(JSON.stringify({"status":"post-not-found"}))
			}
			
		}else{
			response.sendStatus(404)
		}
		
	}catch{
		response.send(JSON.stringify({"status":"server-error"}))
	}
})

async function GetVideoCategories(videos){
	
	let categories = []
	
	for(var i=0; i<videos.length; i++){
		
		let video = videos[i]
		
		let cat = video.category 
		
		let check = categories.includes(cat)
		
		if(check != true){
			categories.push(cat)
		}
		
	}
	
	return categories
	
}

app.post("/get-video-categories", async(request,response)=>{
	try{
		
		let data = request.body
		let userId = data.userId 
		let socketCheck = await checkIfSocketActive(userId)
		if(socketCheck == true){
			
			let getVideos = await mongoClient.db("YEMPData").collection("MainData").findOne({"name":"video-posts"})
			let videos = getVideos.body 
			
			let process_for_category = await GetVideoCategories(videos)
			
			response.send(JSON.stringify({"status":"success","data":process}))
			
		}else{
			response.sendStatus(404)
		}
		
	}catch{
		response.send(JSON.stringify({"status":"server-error"}))
	}
})

app.post("/get-videos-by-category", async(request,response)=>{
	try{
		let data = request.body
		let userId = data.userId 
		let category = data.category
		let socketCheck = await checkIfSocketActive(userId)
		if(socketCheck == true){
			let getVideos = await mongoClient.db("YEMPData").collection("MainData").findOne({"name":"video-posts"})
			let videos = getVideos.body 
			
			let process_for_categories = await GetVideosByCategory(videos)
			
			let output = {
				"businessPosts" : [],
				"userPosts" : [],
				"channelPosts" :  [],
				"articles" : [],
				"videoPosts" : process_for_categories,
				"storyPosts": [],
				"groupPosts" : [],
				"topicPosts" : [],
				"marketPlacePosts": []
			}
			
			let process_for_dates = await TimePeriodProcessor(output)
            let process_for_views_count = await ViewsProcessor(process_for_dates,userId)
			
			response.send(JSON.stringify({"status":"success","data":process_for_views_count.videoPosts}))
			
		}else{
			response.sendStatus(404)
		}
	}catch{
		response.send(JSON.stringify({"status":"server-error"}))
	}
})

app.post("/upload-user-image/:id", async(request,response)=>{
    
    try{ 
        let userId = request.params.id
        let check = await checkIfSocketActive(userId)
        let socket = getUserSocket(userId)
        let mediaId = socket.mediaId
        let mediaFormat = socket.mediaFormat
        if(check == true){ 
            let data = request.body
            data.mv(__dirname + `/User Data/${userId}/Images/${mediaId}.${mediaFormat}` , (error)=>{
                if(error){
                    console.log(error)
                }else{
                    response.send(JSON.stringify({"status": "success"}))
                }
            })
        } 
    }catch{
        response.sendStatus(404)
    }
    
})

app.post("/upload-user-video/:id", async(request,response)=>{
    
    try{ 
        let userId = request.params.id
        let check = await checkIfSocketActive(userId)
        let socket = getUserSocket(userId)
        let mediaId = socket.mediaId
        let mediaFormat = socket.mediaFormat
        if(check == true){ 
            let data = request.body
            data.mv(__dirname + `/User Data/${userId}/Videos/${mediaId}.${mediaFormat}` , (error)=>{
                if(error){
                    console.log(error)
                }else{
                    response.send(JSON.stringify({"status": "success"}))
                }
            })
        } 
    }catch{
        response.sendStatus(404)
    }
    
})

app.post("/upload-user-audio/:id", async(request,response)=>{
    
    try{ 
        let userId = request.params.id
        let check = await checkIfSocketActive(userId)
        let socket = getUserSocket(userId)
        let mediaId = socket.mediaId
        let mediaFormat = socket.mediaFormat
        if(check == true){ 
            let data = request.body
            data.mv(__dirname + `/User Data/${userId}/Audio/${mediaId}.${mediaFormat}` , (error)=>{
                if(error){
                    console.log(error)
                }else{
                    response.send(JSON.stringify({"status": "success"}))
                }
            })
        } 
    }catch{
        response.sendStatus(404)
    }
    
})

app.post("/upload-business-image/:id", async(request,response)=>{
    
    try{ 
        let userId = request.params.id
        let check = await checkIfSocketActive(userId)
        let socket = getUserSocket(userId)
        let businessId = socket.businessId
        let mediaId = socket.mediaId
        let mediaFormat = socket.mediaFormat
        let ownerId = socket.ownerId
        if(check == true){ 
            let data = request.body
            data.mv(__dirname + `/User Data/${ownerId}/Businesses/${businessId}/Images/${mediaId}.${mediaFormat}` , (error)=>{
                if(error){
                    console.log(error)
                }else{
                    response.send(JSON.stringify({"status": "success"}))
                }
            })
        } 
    }catch{
        response.sendStatus(404)
    }
    
})

app.post("/upload-business-video/:id", async(request,response)=>{
    
    try{ 
        let userId = request.params.id
        let check = await checkIfSocketActive(userId)
        let socket = getUserSocket(userId)
        let businessId = socket.businessId
        let mediaId = socket.mediaId
        let mediaFormat = socket.mediaFormat
        let ownerId = socket.ownerId
        if(check == true){ 
            let data = request.body
            data.mv(__dirname + `/User Data/${ownerId}/Businesses/${businessId}/Videos/${mediaId}.${mediaFormat}` , (error)=>{
                if(error){
                    console.log(error)
                }else{
                    response.send(JSON.stringify({"status": "success"}))
                }
            })
        } 
    }catch{
        response.sendStatus(404)
    }
    
})

app.post("/upload-business-audio/:id", async(request,response)=>{
    
    try{ 
        let userId = request.params.id
        let check = await checkIfSocketActive(userId)
        let socket = getUserSocket(userId)
        let businessId = socket.businessId
        let mediaId = socket.mediaId
        let mediaFormat = socket.mediaFormat
        let ownerId = socket.ownerId
        if(check == true){ 
            let data = request.body
            data.mv(__dirname + `/User Data/${ownerId}/Businesses/${businessId}/Audio/${mediaId}.${mediaFormat}` , (error)=>{
                if(error){
                    console.log(error)
                }else{
                    response.send(JSON.stringify({"status": "success"}))
                }
            })
        } 
    }catch{
        response.sendStatus(404)
    }
    
})


const FindUserStory = async(userId,stories)=>{
    let output = null 
    
    for(var i=0; i<stories.length; i++){
        let story = stories[i]
        let basicDetails = story.basicDetails 
        let userIdx = basicDetails.ownerId
		let businessIdx = basicDetails.businessId
        if(userIdx === userId || userId == businessIdx){
            let datex = story.timePosted
            if(
                datex.date == serverTime.date &&
                datex.month == serverTime.month &&
                datex.year == serverTime.year
            ){
                output = story
            }
        }
    }
    return output
}

app.post("/get-current-story", async(request,response)=>{
    try{
        
        let data = request.body 
        
        let accessorId = data.accessorId
		//User ID universal with businessId
        let userId = data.userId
		let socketCheck = await checkIfSocketActive(accessorId)
        
		if(socketCheck == true){
			let getStoryPosts = await mongoClient.db("YEMPData").collection("MainData").findOne({"name":"story-posts"})
			let stories = getStoryPosts.body
			
			let checkForStory = await FindUserStory(userId,stories)
			
			if(checkForStory){
				response.send(JSON.stringify({"status":"success", "data": checkForStory}))
			}else{
				response.send(JSON.stringify({"status":"success", "data": null}))
			}
		}else{
			response.sendStatus(404)
		}
        
        
    }catch{
        response.send(JSON.stringify({"status":"server-error"}))
    }
});

app.post("/update-story",async(request,response)=>{
	try{
		
		let data = request.body
		
		let accessorId = data.accessorId 
		let story = data.story  
		
		let socketCheck = await checkIfSocketActive(accessorId)
		
		if(socketCheck == true){
		
			let getStories = await mongoClient.db("YEMPData").collection("MainData").findOne({"name":"story-posts"})
			
			let stories = getStories.body
			
			let storyx = null
			
			if(story.basicDetails.businessId != null){
				storyx = await FindUserStory(story.basicDetails.businessId,stories)
			}else{			
				storyx = await FindUserStory(story.basicDetails.ownerId,stories)
			}
			
			if(storyx){
				
				let index = stories.find((stories)=>{
					return stories.basicDetails.id === storyx.basicDetails.id
				})
				
				stories[index] = story
				
				await mongoClient.db("YEMPData").collection("MainData").findOne({"name":"story-posts"},{$set:{"body":stories}})
				
			}else{
				
				stories.push(story)
				await mongoClient.db("YEMPData").collection("MainData").findOne({"name":"story-posts"},{$set:{"body":stories}})
				
			}
			
			response.send(JSON.stringify({"status":"success"}))
			
		}else{
			response.sendStatus(404)
		}
		
	}catch{
		response.send(JSON.stringify({"status":"server-error"}))
	}
})

app.post("/register-channel-feed",async(request,response)=>{
	try{
		
		let data = request.body 
		let userId = data.userId 
		let businessId = null
		if(data.businessId){
			businessId = data.businessId
		}
		let feed = data.feed 
		let socketCheck = await checkIfSocketActive(userId)
		if(socketCheck == true){
			
			var getChannelPosts = await mongoClient.db("YEMPData").collection("MainData").findOne({"name":"channel-posts"})
            let channelPosts = getChannelPosts.body 
			let search = channelPosts.find((channelPosts)=>{
				return channelPosts.basicDetails.id === feed.basicDetails.id
			})
			if(!search){				
				channelPosts.push(feed)
				await mongoClient.db("YEMPData").collection("MainData").updateOne({"name":"channel-posts"},{$set:{"body":channelPosts}})
				response.send(JSON.stringify({"status":"succcess"}))
			}else{
				response.send(JSON.stringify("status":"exists"))
			}
			
		}else{
			response.sendStatus(404)
		}
		
	}catch{
		response.send(JSON.stringify({"status":"server-error"}))
	}
})

app.post("/upload-post" , async(request,response)=>{
    try{
        let data = request.body
        let userId = data.userId 
        let post = data.post
        let type = data.type 
        
		let socketCheck = await checkIfSocketActive(userId)
		if(socketCheck == true){
            var getBusinessPosts = await mongoClient.db("YEMPData").collection("MainData").findOne({"name":"business-posts"}) 
            var getUserPosts = await mongoClient.db("YEMPData").collection("MainData").findOne({"name":"user-posts"})
            var getChannelPosts = await mongoClient.db("YEMPData").collection("MainData").findOne({"name":"channel-posts"})
            var getArticlePosts = await mongoClient.db("YEMPData").collection("MainData").findOne({"name":"article-posts"})
            var getVideoPosts = await mongoClient.db("YEMPData").collection("MainData").findOne({"name":"video-posts"})
            var getReligiousPosts = await mongoClient.db("YEMPData").collection("MainData").findOne({"name":"religious-posts"})
            var getGroupPosts = await mongoClient.db("YEMPData").collection("MainData").findOne({"name":"group-posts"})
            var getStoryPosts = await mongoClient.db("YEMPData").collection("MainData").findOne({"name":"story-posts"})
            var getMarketPlacePosts = await mongoClient.db("YEMPData").collection("MainData").findOne({"name":"market-place-posts"})
            var getEvents = await mongoClient.db("YEMPData").collection("MainData").findOne({"name":"all-events"})
            var getTips = await mongoClient.db("YEMPData").collection("MainData").findOne({"name":"business-tips"})
            
            
            
            //extraction 
            let businessPosts = getBusinessPosts.body  
            let userPosts = getUserPosts.body
            let channelPosts = getChannelPosts.body
            let articles = getArticlePosts.body 
            let videoPosts = getVideoPosts.body
            let storyPosts = getStoryPosts.body
            let groupPosts = getGroupPosts.body
            let religiousPosts = getReligiousPosts.body
            let marketPlacePosts = getMarketPlacePosts.body
            let events = getEvents.body
            let tips = getTips.body 
			
			if(type === "Basic Text Post"){ 
				userPosts.push(post)
				await mongoClient.db("YEMPData").collection("MainData").updateOne({"name":"user-posts"},{$set:{"body" : userPosts}})
			}
			if(type === "Media Post"){ 
				 userPosts.push(post)
				 await mongoClient.db("YEMPData").collection("MainData").updateOne({"name":"user-posts"},{$set:{"body" : userPosts}})
			} 
			if(type === "Video Post"){ 
				 videoPosts.push(post)
				 await mongoClient.db("YEMPData").collection("MainData").updateOne({"name":"video-posts"},{$set:{"body" : videoPosts}})
			}
			
			if(type === "Article Post"){ 
				 articles.push(post)
				 await mongoClient.db("YEMPData").collection("MainData").updateOne({"name":"article-posts"},{$set:{"body" : articlePosts}})
			}
			
			if(type === "Channel Feed Post"){ 
				 channelPosts.push(post)
				 await mongoClient.db("YEMPData").collection("MainData").updateOne({"name":"channel-posts"},{$set:{"body" : channelPosts}})
			}
			
			if(type === "Market Place Post"){ 
				marketPlacePosts.push(post)
				await mongoClient.db("YEMPData").collection("MainData").updateOne({"name":"market-place-posts"},{$set:{"body" : marketPlacePosts}})
			} 
			if(type === "Business Post"){ 
				businessPosts.push(post)
				await mongoClient.db("YEMPData").collection("MainData").updateOne({"name":"business-posts"},{$set:{"body" : businessPosts}})
			}
			if(type === "Story Post"){ 
				storyPosts.push(post)
				await mongoClient.db("YEMPData").collection("MainData").updateOne({"name":"story-posts"},{$set:{"body" : storyPosts}})
			}
			if(type === "Group Post"){ 
				groupPosts.push(post)
				await mongoClient.db("YEMPData").collection("MainData").updateOne({"name":"group-posts"},{$set:{"body" : groupPosts}})
			}
			if(type === "Religious Post"){ 
				religiousPosts.push(post)
				await mongoClient.db("YEMPData").collection("MainData").updateOne({"name":"religous-posts"},{$set:{"body" : religiousPosts}})
			}
			if(type === "Event"){ 
				events.push(post)
				await mongoClient.db("YEMPData").collection("MainData").updateOne({"name":"all-events"},{$set:{"body" : events}})
			}
			if(type === "Business Tip Of Day"){
			    tips.push(post)
			    await mongoClient.db("YEMPData").collection("MainData").updateOne({"name":"business-tips"},{$set:{"body":tips}})
			}
			
			response.send(JSON.stringify({"status":"success"}))
        }else{
			response.sendStatus(404)
		}
    }catch{
        response.send(JSON.stringify({"status":"server-error"}))
    }
})

app.post("/update-post" , async(request,response)=>{
    try{
        let data = request.body
        let userId = data.userId 
        let post = data.post
        let type = data.type 
        
		let socketCheck = await checkIfSocketActive(userId)
		if(socketCheck == true){
            var getBusinessPosts = await mongoClient.db("YEMPData").collection("MainData").findOne({"name":"business-posts"}) 
            var getUserPosts = await mongoClient.db("YEMPData").collection("MainData").findOne({"name":"user-posts"})
            var getChannelPosts = await mongoClient.db("YEMPData").collection("MainData").findOne({"name":"channel-posts"})
            var getArticlePosts = await mongoClient.db("YEMPData").collection("MainData").findOne({"name":"article-posts"})
            var getVideoPosts = await mongoClient.db("YEMPData").collection("MainData").findOne({"name":"video-posts"})
            var getReligiousPosts = await mongoClient.db("YEMPData").collection("MainData").findOne({"name":"religious-posts"})
            var getGroupPosts = await mongoClient.db("YEMPData").collection("MainData").findOne({"name":"group-posts"})
            var getStoryPosts = await mongoClient.db("YEMPData").collection("MainData").findOne({"name":"story-posts"})
            var getMarketPlacePosts = await mongoClient.db("YEMPData").collection("MainData").findOne({"name":"market-place-posts"})
            var getEvents = await mongoClient.db("YEMPData").collection("MainData").findOne({"name":"all-events"})
            var getTips = await mongoClient.db("YEMPData").collection("MainData").findOne({"name":"business-tips"})
            
            
            //extraction 
            let businessPosts = getBusinessPosts.body  
            let userPosts = getUserPosts.body
            let channelPosts = getChannelPosts.body
            let articles = getArticlePosts.body 
            let videoPosts = getVideoPosts.body
            let storyPosts = getStoryPosts.body
            let groupPosts = getGroupPosts.body
            let religiousPosts = getReligiousPosts.body
            let marketPlacePosts = getMarketPlacePosts.body
            let events = getEvents.body
            let tips = getTips.body
             
            let index = null 
            
            index = businessPosts.findIndex((businessPosts)=>{
                return businessPosts.basicDetails.id === post.basicDetails.id
            })
            if(index == null){
                index = marketPlacePosts.findIndex((marketPlacePosts)=>{
                    return marketPlacePosts.basicDetails.id === post.basicDetails.id
                })
            }
            if(index == null){
                index = religiousPosts.findIndex((religiousPosts)=>{
                    return religiousPosts.basicDetails.id === post.basicDetails.id
                })
            }
            if(index == null){
                index = groupPosts.findIndex((groupPosts)=>{
                    return groupPosts.basicDetails.id === post.basicDetails.id
                })
            }
            if(index == null){
                index = userPosts.findIndex((userPosts)=>{
                    return userPosts.basicDetails.id === post.basicDetails.id
                })
            }
            if(index == null){
                index = storyPosts.findIndex((storyPosts)=>{
                    return storyPosts.basicDetails.id === post.basicDetails.id
                })
            }
            if(index == null){
                index = videoPosts.findIndex((videoPosts)=>{
                    return videoPosts.basicDetails.id === post.basicDetails.id
                })
            }
            if(index == null){
                index = events.findIndex((events)=>{
                    return events.basicDetails.id === post.basicDetails.id
                })
            }
            if(index == null){
                index = articles.findIndex(articles)=>{
                    return articles.basicDetails.id === post.basicDetails.id
                })
            }
            if(index == null){
                index = channelPosts.findIndex((channelPosts)=>{
                    return channelPosts.basicDetails.id === post.basicDetails.id
                })
            }
			if(index == null){
				index = tips.find((tips)=>{
					return tips.basicDetails.id === post.basicDetails.id
				}
			}
			
			if(type === "Basic Text Post"){ 
				userPosts[index] = post
				await mongoClient.db("YEMPData").collection("MainData").updateOne({"name":"user-posts"},{$set:{"body" : userPosts}})
			}
			if(type === "Media Post"){ 
				 userPosts[index] = post
				 await mongoClient.db("YEMPData").collection("MainData").updateOne({"name":"user-posts"},{$set:{"body" : userPosts}})
			} 
			if(type === "Video Post"){ 
				 videoPosts[index] = post
				 await mongoClient.db("YEMPData").collection("MainData").updateOne({"name":"video-posts"},{$set:{"body" : videoPosts}})
			}
			
			if(type === "Article Post"){ 
				 articles[index] = post
				 await mongoClient.db("YEMPData").collection("MainData").updateOne({"name":"article-posts"},{$set:{"body" : articles}})
			}
			
			if(type === "Channel Feed Post"){ 
				 channelPosts[index] = post
				 await mongoClient.db("YEMPData").collection("MainData").updateOne({"name":"channel-posts"},{$set:{"body" : channelPosts}})
			}
			
			if(type === "Market Place Post"){ 
				marketPlacePosts[index] = post
				await mongoClient.db("YEMPData").collection("MainData").updateOne({"name":"market-place-posts"},{$set:{"body" : marketPlacePosts}})
			} 
			if(type === "Business Post"){ 
				businessPosts[index] = post
				await mongoClient.db("YEMPData").collection("MainData").updateOne({"name":"business-posts"},{$set:{"body" : businessPosts}})
			}
			if(type === "Story Post"){ 
				storyPosts.push(post)
				await mongoClient.db("YEMPData").collection("MainData").updateOne({"name":"story-posts"},{$set:{"body" : storyPosts}})
			}
			if(type === "Group Post"){ 
				groupPosts.push(post)
				await mongoClient.db("YEMPData").collection("MainData").updateOne({"name":"group-posts"},{$set:{"body" : groupPosts}})
			}
			if(type === "Religious Post"){ 
				religiousPosts[index] = post
				await mongoClient.db("YEMPData").collection("MainData").updateOne({"name":"religous-posts"},{$set:{"body" : religiousPosts}})
			}
			if(type === "Event"){ 
				events[index] = post
				await mongoClient.db("YEMPData").collection("MainData").updateOne({"name":"all-events"},{$set:{"body" : events}})
			}
			if(type === "Business Tip Of Day"){
			    tips[index] = post
			    await mongoClient.db("YEMPData").collection("MainData").updateOne({"name":"business-tips"},{$set:{"body":tips}})
			}
			
			response.send(JSON.stringify({"status":"success"}))
        }else{
			response.sendStatus(404)
		}
    }catch{
        response.send(JSON.stringify({"status":"server-error"}))
    }
})

app.post("/find-post" , async(request,response)=>{
    try{
        let data = request.body
        let userId = data.userId 
        let post = data.post
         
        
		let socketCheck = await checkIfSocketActive(userId)
		if(socketCheck == true){
            var getBusinessPosts = await mongoClient.db("YEMPData").collection("MainData").findOne({"name":"business-posts"}) 
            var getUserPosts = await mongoClient.db("YEMPData").collection("MainData").findOne({"name":"user-posts"})
            var getChannelPosts = await mongoClient.db("YEMPData").collection("MainData").findOne({"name":"channel-posts"})
            var getArticlePosts = await mongoClient.db("YEMPData").collection("MainData").findOne({"name":"article-posts"})
            var getVideoPosts = await mongoClient.db("YEMPData").collection("MainData").findOne({"name":"video-posts"})
            var getReligiousPosts = await mongoClient.db("YEMPData").collection("MainData").findOne({"name":"religious-posts"})
            var getGroupPosts = await mongoClient.db("YEMPData").collection("MainData").findOne({"name":"group-posts"})
            var getStoryPosts = await mongoClient.db("YEMPData").collection("MainData").findOne({"name":"story-posts"})
            var getMarketPlacePosts = await mongoClient.db("YEMPData").collection("MainData").findOne({"name":"market-place-posts"})
            var getEvents = await mongoClient.db("YEMPData").collection("MainData").findOne({"name":"all-events"})
            var getTips = await mongoClient.db("YEMPData").collection("MainData").findOne({"name":"business-tips"})
            
            
            //extraction 
            let businessPosts = getBusinessPosts.body  
            let userPosts = getUserPosts.body
            let channelPosts = getChannelPosts.body
            let articles = getArticlePosts.body 
            let videoPosts = getVideoPosts.body
            let storyPosts = getStoryPosts.body
            let groupPosts = getGroupPosts.body
            let religiousPosts = getReligiousPosts.body
            let marketPlacePosts = getMarketPlacePosts.body
            let events = getEvents.body
            let tips = getTips.body
             
            let index = null 
            
            index = businessPosts.findIndex((businessPosts)=>{
                return businessPosts.basicDetails.id === post.basicDetails.id
            })
            if(index == null){
                index = marketPlacePosts.findIndex((marketPlacePosts)=>{
                    return marketPlacePosts.basicDetails.id === post.basicDetails.id
                })
            }else{
				type = "business posts"
			}
            if(index == null){
                index = religiousPosts.findIndex((religiousPosts)=>{
                    return religiousPosts.basicDetails.id === post.basicDetails.id
                })
            }else{
				type = "market place posts"
			}
            if(index == null){
                index = groupPosts.findIndex((groupPosts)=>{
                    return groupPosts.basicDetails.id === post.basicDetails.id
                })
            }else{
				type = "religious posts"
			}
            if(index == null){
                index = userPosts.findIndex((userPosts)=>{
                    return userPosts.basicDetails.id === post.basicDetails.id
                })
            }else{
				type = "group posts"
			}
            if(index == null){
                index = storyPosts.findIndex((storyPosts)=>{
                    return storyPosts.basicDetails.id === post.basicDetails.id
                })
            }else{
				type = "user posts"
			}
            if(index == null){
                index = videoPosts.findIndex((videoPosts)=>{
                    return videoPosts.basicDetails.id === post.basicDetails.id
                })
            }else{
				type = "story posts"
			}
            if(index == null){
                index = events.findIndex((events)=>{
                    return events.basicDetails.id === post.basicDetails.id
                })
            }else{
				type = "video posts"
			}
            if(index == null){
                index = articles.findIndex(articles)=>{
                    return articles.basicDetails.id === post.basicDetails.id
                })
            }else{
				type = "events"
			}
            if(index == null){
                index = channelPosts.findIndex((channelPosts)=>{
                    return channelPosts.basicDetails.id === post.basicDetails.id
                })
            }else{
				type = "article posts"
			}
			if(index == null){
                index = tips.findIndex((tips)=>{
                    return tips.basicDetails.id === post.basicDetails.id
                })
            }else{
				type = "channel posts"
			}
			if(index != null){
				type = "tips"
			}

			let output = null
			
			if(type === "user posts"){ 
				output = userPosts[index]
			}
			
			if(type === "video posts"){ 
				output = videoPosts[index]
			}
			
			if(type === "article posts"){ 
				output = articles[index]
			}
			
			if(type === "channel posts"){ 
				output = channelPosts[index]
			}
			
			if(type === "market place posts"){ 
				output = marketPlacePosts[index]
			} 
			if(type === "business posts"){ 
				output = businessPosts[index]
			}
			if(type === "story posts"){ 
				output = storyPosts[index]
			}
			if(type === "group posts"){ 
				output = groupPosts[index]
			}
			if(type === "religious posts"){ 
				output = religiousPosts[index]
			}
			if(type === "events"){ 
				output = events[index]
			}
			if(type === "tips"){
			    output = tips[index]
			}
			
			response.send(JSON.stringify({"status":"success","data":output}))
        }else{
			response.sendStatus(404)
		}
    }catch{
        response.send(JSON.stringify({"status":"server-error"}))
    }
})


app.post("/comment-like-unlike" , async(request,response)=>{
    try{
        let data = request.body
        let userId = data.userId 
        let commentId = data.commentId
        let action = data.action
        let postId = data.postId
        let type = data.type 
        
            var getBusinessPosts = await mongoClient.db("YEMPData").collection("MainData").findOne({"name":"business-posts"}) 
            var getUserPosts = await mongoClient.db("YEMPData").collection("MainData").findOne({"name":"user-posts"})
            var getChannelPosts = await mongoClient.db("YEMPData").collection("MainData").findOne({"name":"channel-posts"})
            var getArticlePosts = await mongoClient.db("YEMPData").collection("MainData").findOne({"name":"article-posts"})
            var getVideoPosts = await mongoClient.db("YEMPData").collection("MainData").findOne({"name":"video-posts"})
            var getTopicPosts = await mongoClient.db("YEMPData").collection("MainData").findOne({"name":"topic-posts"})
            var getGroupPosts = await mongoClient.db("YEMPData").collection("MainData").findOne({"name":"group-posts"})
            var getStoryPosts = await mongoClient.db("YEMPData").collection("MainData").findOne({"name":"story-posts"})
            var getMarketPlacePosts = await mongoClient.db("YEMPData").collection("MainData").findOne({"name":"market-place-posts"})
            var getEvents = await mongoClient.db("YEMPData").collection("MainData").findOne({"name":"all-events"})
            
            
            
            //extraction 
            let businessPosts = getBusinessPosts.body  
            let userPosts = getUserPosts.body
            let channelPosts = getChannelPosts.body
            let articles = getArticlePosts.body 
            let videoPosts = getVideoPosts.body
            let storyPosts = getStoryPosts.body
            let groupPosts = getGroupPosts.body
            let topicPosts = getTopicPosts.body
            let marketPlacePosts = getMarketPlacePosts.body
            let events = getEvents.body
            
        const Processor = (postId,userId,commentId,action)=>{
            let output = { 
                "status": null,
                "count" : 0
            }
            
            if(type === "Basic Text Post"){ 
                
                let post = userPosts.findOne((userPosts)=>{
                    return userPosts.id === postId
                })
                
                if(post) {
                
                    let comments = post.basicDetails.comments 
                    
                    let comment = comments.findOne((comments)=>{
                        comments.id === commentId
                    })
                    
                    if(comment){
                        
                        if(action === "like" || action === "unlike"){
                            
                            let likes = comment.likes
                            let search = likes.includes(userId)
                            if(search == true){
                                let index = likes.indexOf(userId)
                                likes.splice(index,1)
                                output.status = "unlike"
                                output.count = likes.length
                            }else{
                                
                                likes.push(userId)
                                output.status = "like"
                                output.count = likes.length
                            }
                        }else{
                            let likes = comment.dislikes
                            let search = dislikes.includes(userId)
                            if(search == true){
                                let index = dislikes.indexOf(userId)
                                dislikes.splice(index,1)
                                output.status = "undislike"
                                output.count = likes.length
                            }else{
                                
                                dislikes.push(userId)
                                output.status = "dislike"
                                output.count = likes.length
                            }
                        }
                        
                    }else{
                        output.status = "comment deleted"
                    }
                
                }else{
                    output.status = "post deleted"
                }
               
            }
            if(type === "Media Story Post"){ 
                 let post = userPosts.findOne((userPosts)=>{
                    return userPosts.id === postId
                })
                
                if(post) {
                
                    let comments = post.basicDetails.comments 
                    
                    let comment = comments.findOne((comments)=>{
                        comments.id === commentId
                    })
                    
                    if(comment){
                        
                        if(action === "like" || action === "unlike"){
                            
                            let likes = comment.likes
                            let search = likes.includes(userId)
                            if(search == true){
                                let index = likes.indexOf(userId)
                                likes.splice(index,1)
                                output.status = "unlike"
                                output.count = likes.length
                            }else{
                                
                                likes.push(userId)
                                output.status = "like"
                                output.count = likes.length
                            }
                        }else{
                            let likes = comment.dislikes
                            let search = dislikes.includes(userId)
                            if(search == true){
                                let index = dislikes.indexOf(userId)
                                dislikes.splice(index,1)
                                output.status = "undislike"
                                output.count = likes.length
                            }else{
                                
                                dislikes.push(userId)
                                output.status = "dislike"
                                output.count = likes.length
                            }
                        }
                        
                    }else{
                        output.status = "comment deleted"
                    }
                
                }else{
                    output.status = "post deleted"
                }
            } 
            if(type === "Video Post"){ 
                 let post = videoPosts.findOne((videoPosts)=>{
                    return videoPosts.id === postId
                })
                
                if(post) {
                
                    let comments = post.basicDetails.comments 
                    
                    let comment = comments.findOne((comments)=>{
                        comments.id === commentId
                    })
                    
                    if(comment){
                        
                        if(action === "like" || action === "unlike"){
                            
                            let likes = comment.likes
                            let search = likes.includes(userId)
                            if(search == true){
                                let index = likes.indexOf(userId)
                                likes.splice(index,1)
                                output.status = "unlike"
                                output.count = likes.length
                            }else{
                                
                                likes.push(userId)
                                output.status = "like"
                                output.count = likes.length
                            }
                        }else{
                            let likes = comment.dislikes
                            let search = dislikes.includes(userId)
                            if(search == true){
                                let index = dislikes.indexOf(userId)
                                dislikes.splice(index,1)
                                output.status = "undislike"
                                output.count = likes.length
                            }else{
                                
                                dislikes.push(userId)
                                output.status = "dislike"
                                output.count = likes.length
                            }
                        }
                        
                    }else{
                        output.status = "comment deleted"
                    }
                
                }else{
                    output.status = "post deleted"
                }
            }
            
            if(type === "Article Post"){ 
                let post = articlePosts.findOne((articlePosts)=>{
                    return articlePosts.id === postId
                })
                
                if(post) {
                
                    let comments = post.basicDetails.comments 
                    
                    let comment = comments.findOne((comments)=>{
                        comments.id === commentId
                    })
                    
                    if(comment){
                        
                        if(action === "like" || action === "unlike"){
                            
                            let likes = comment.likes
                            let search = likes.includes(userId)
                            if(search == true){
                                let index = likes.indexOf(userId)
                                likes.splice(index,1)
                                output.status = "unlike"
                                output.count = likes.length
                            }else{
                                
                                likes.push(userId)
                                output.status = "like"
                                output.count = likes.length
                            }
                        }else{
                            let likes = comment.dislikes
                            let search = dislikes.includes(userId)
                            if(search == true){
                                let index = dislikes.indexOf(userId)
                                dislikes.splice(index,1)
                                output.status = "undislike"
                                output.count = likes.length
                            }else{
                                
                                dislikes.push(userId)
                                output.status = "dislike"
                                output.count = likes.length
                            }
                        }
                        
                    }else{
                        output.status = "comment deleted"
                    }
                
                }else{
                    output.status = "post deleted"
                }
            }
            
            if(type === "Channel Feed Post"){ 
                let post = channelPosts.findOne((channelPosts)=>{

                    return channelPosts.id === postId

                })
                
                if(post) {
                
                    let comments = post.basicDetails.comments 
                    
                    let comment = comments.findOne((comments)=>{
                        comments.id === commentId
                    })
                    
                    if(comment){
                        
                        if(action === "like" || action === "unlike"){
                            
                            let likes = comment.likes
                            let search = likes.includes(userId)
                            if(search == true){
                                let index = likes.indexOf(userId)
                                likes.splice(index,1)
                                output.status = "unlike"
                                output.count = likes.length
                            }else{
                                
                                likes.push(userId)
                                output.status = "like"
                                output.count = likes.length
                            }
                        }else{
                            let likes = comment.dislikes
                            let search = dislikes.includes(userId)
                            if(search == true){
                                let index = dislikes.indexOf(userId)
                                dislikes.splice(index,1)
                                output.status = "undislike"
                                output.count = likes.length
                            }else{
                                
                                dislikes.push(userId)
                                output.status = "dislike"
                                output.count = likes.length
                            }
                        }
                        
                    }else{
                        output.status = "comment deleted"
                    }
                
                }else{
                    output.status = "post deleted"
                }
            }
            
            if(type === "Market Place Post"){ 
                let post = marketPlacePosts.findOne((marketPlacePosts)=>{
                    return marketPlacePosts.id === postId
                })
                
                if(post) {
                
                    let comments = post.basicDetails.comments 
                    
                    let comment = comments.findOne((comments)=>{
                        comments.id === commentId
                    })
                    
                    if(comment){
                        
                        if(action === "like" || action === "unlike"){
                            
                            let likes = comment.likes
                            let search = likes.includes(userId)
                            if(search == true){
                                let index = likes.indexOf(userId)
                                likes.splice(index,1)
                                output.status = "unlike"
                                output.count = likes.length
                            }else{
                                
                                likes.push(userId)
                                output.status = "like"
                                output.count = likes.length
                            }
                        }else{
                            let likes = comment.dislikes
                            let search = dislikes.includes(userId)
                            if(search == true){
                                let index = dislikes.indexOf(userId)
                                dislikes.splice(index,1)
                                output.status = "undislike"
                                output.count = likes.length
                            }else{
                                
                                dislikes.push(userId)
                                output.status = "dislike"
                                output.count = likes.length
                            }
                        }
                        
                    }else{
                        output.status = "comment deleted"
                    }
                
                }else{
                    output.status = "post deleted"
                }
            }
            if(type === "Business Post"){ 
                let post = businessPosts.findOne((businessPosts)=>{

                    return businessPosts.id === postId

                })
                
                if(post) {
                
                    let comments = post.basicDetails.comments 
                    
                    let comment = comments.findOne((comments)=>{
                        comments.id === commentId
                    })
                    
                    if(comment){
                        
                        if(action === "like" || action === "unlike"){
                            
                            let likes = comment.likes
                            let search = likes.includes(userId)
                            if(search == true){
                                let index = likes.indexOf(userId)
                                likes.splice(index,1)
                                output.status = "unlike"
                                output.count = likes.length
                            }else{
                                
                                likes.push(userId)
                                output.status = "like"
                                output.count = likes.length
                            }
                        }else{
                            let likes = comment.dislikes
                            let search = dislikes.includes(userId)
                            if(search == true){
                                let index = dislikes.indexOf(userId)
                                dislikes.splice(index,1)
                                output.status = "undislike"
                                output.count = likes.length
                            }else{
                                
                                dislikes.push(userId)
                                output.status = "dislike"
                                output.count = likes.length
                            }
                        }
                        
                    }else{
                        output.status = "comment deleted"
                    }
                
                }else{
                    output.status = "post deleted"
                }
            }
            if(type === "Story Post"){ 
                let post = storyPosts.findOne((storyPosts)=>{

                    return storyPosts.id === postId

                })
                
                if(post) {
                
                    let comments = post.basicDetails.comments 
                    
                    let comment = comments.findOne((comments)=>{
                        comments.id === commentId
                    })
                    
                    if(comment){
                        
                        if(action === "like" || action === "unlike" ){
                            
                            let likes = comment.likes
                            let search = likes.includes(userId)
                            if(search == true){
                                let index = likes.indexOf(userId)
                                likes.splice(index,1)
                                output.status = "unlike"
                                output.count = likes.length
                            }else{
                                
                                likes.push(userId)
                                output.status = "like"
                                output.count = likes.length
                            }
                        }else{
                            let likes = comment.dislikes
                            let search = dislikes.includes(userId)
                            if(search == true){
                                let index = dislikes.indexOf(userId)
                                dislikes.splice(index,1)
                                output.status = "undislike"
                                output.count = likes.length
                            }else{
                                
                                dislikes.push(userId)
                                output.status = "dislike"
                                output.count = likes.length
                            }
                        }
                        
                    }else{
                        output.status = "comment deleted"
                    }
                
                }else{
                    output.status = "post deleted"
                }
            }
            if(type === "Topic Post"){ 
                let post = topicPosts.findOne((topicPosts)=>{

                    return topicPosts.id === postId

                })
                
                if(post) {
                
                    let comments = post.messages 
                    
                    let comment = comments.findOne((comments)=>{
                        comments.id === commentId
                    })
                    
                    if(comment){
                        
                        if(action === "like" || action == "unlike"){
                            
                            let likes = comment.likes
                            let search = likes.includes(userId)
                            if(search == true){
                                let index = likes.indexOf(userId)
                                likes.splice(index,1)
                                output.status = "unlike"
                                output.count = likes.length
                            }else{
                                
                                likes.push(userId)
                                output.status = "like"
                                output.count = likes.length
                            }
                        }else{
                            let likes = comment.dislikes
                            let search = dislikes.includes(userId)
                            if(search == true){
                                let index = dislikes.indexOf(userId)
                                dislikes.splice(index,1)
                                output.status = "undislike"
                                output.count = likes.length
                            }else{
                                
                                dislikes.push(userId)
                                output.status = "dislike"
                                output.count = likes.length
                            }
                        }
                        
                    }else{
                        output.status = "comment deleted"
                    }
                
                }else{
                    output.status = "post deleted"
                }
            }
            if(type === "Group Post"){ 
                let post = groupPosts.findOne((groupPosts)=>{

                    return groupPosts.id === postId

                })
                
                if(post) {
                
                    let comments = post.basicDetails.comments 
                    
                    let comment = comments.findOne((comments)=>{
                        comments.id === commentId
                    })
                    
                    if(comment){
                        
                        if(action === "like" || action == "unlike"){
                            
                            let likes = comment.likes
                            let search = likes.includes(userId)
                            if(search == true){
                                let index = likes.indexOf(userId)
                                likes.splice(index,1)
                                output.status = "unlike"
                                output.count = likes.length
                            }else{
                                
                                likes.push(userId)
                                output.status = "like"
                                output.count = likes.length
                            }
                        }else{
                            let likes = comment.dislikes
                            let search = dislikes.includes(userId)
                            if(search == true){
                                let index = dislikes.indexOf(userId)
                                dislikes.splice(index,1)
                                output.status = "undislike"
                                output.count = likes.length
                            }else{
                                
                                dislikes.push(userId)
                                output.status = "dislike"
                                output.count = likes.length
                            }
                        }
                        
                    }else{
                        output.status = "comment deleted"
                    }
                
                }else{
                    output.status = "post deleted"
                }
            }
            
            return output

        }
         
         
        let out;
        
        if(type === "Basic Text Post"){ 
            out = Processor(postId,userId,commentId,action)
            await mongoClient.db("YEMPData").collection("MainData").updateOne({"name":"user-posts"},{$set:{"body" : userPosts}})
        }
        if(type === "Media Story Post"){ 
             out = Processor(postId,userId,commentId,action)
             await mongoClient.db("YEMPData").collection("MainData").updateOne({"name":"user-posts"},{$set:{"body" : userPosts}})
        } 
        if(type === "Video Post"){ 
             out = Processor(postId,userId,commentId,action)
             await mongoClient.db("YEMPData").collection("MainData").updateOne({"name":"video-posts"},{$set:{"body" : videoPosts}})
        }
        
        if(type === "Article Post"){ 
             out = Processor(postId,userId,commentId,action)
             await mongoClient.db("YEMPData").collection("MainData").updateOne({"name":"article-posts"},{$set:{"body" : articlePosts}})
        }
        
        if(type === "Channel Feed Post"){ 
             out = Processor(postId,userId,commentId,action)
             await mongoClient.db("YEMPData").collection("MainData").updateOne({"name":"channel-posts"},{$set:{"body" : channelPosts}})
        }
        
        if(type === "Market Place Post"){ 
            out = Processor(postId,userId,commentId,action)
            await mongoClient.db("YEMPData").collection("MainData").updateOne({"name":"market-place-posts"},{$set:{"body" : marketPlacePosts}})
        } 
        if(type === "Business Post"){ 
            out = Processor(postId,userId,commentId,action)
            await mongoClient.db("YEMPData").collection("MainData").updateOne({"name":"business-posts"},{$set:{"body" : businessPosts}})
        }
        if(type === "Story Post"){ 
            out = Processor(postId,userId,commentId,action)
            await mongoClient.db("YEMPData").collection("MainData").updateOne({"name":"story-posts"},{$set:{"body" : storyPosts}})
        }
        if(type === "Group Post"){ 
            groupPosts.push(post)
            await mongoClient.db("YEMPData").collection("MainData").updateOne({"name":"group-posts"},{$set:{"body" : groupPosts}})
        }
        if(type === "Topic Post"){ 
            topicPosts.push(post)
            await mongoClient.db("YEMPData").collection("MainData").updateOne({"name":"topic-posts"},{$set:{"body" : topicPosts}})
        }
        
        
        response.send(JSON.stringify({"status":"success","data":out}))
        
    }catch{
        response.send(JSON.stringify({"status":"server-error"}))
    }
})

app.post("/upload-comment" , async(request,response)=>{
    try{
        let data = request.body
        let userId = data.userId 
        let reply = data.reply
        if(data.originalComment != null){
            let commentId = data.originalComment
        }
        
        let postId = data.postId
        let type = data.type 
        
            var getBusinessPosts = await mongoClient.db("YEMPData").collection("MainData").findOne({"name":"business-posts"}) 
            var getUserPosts = await mongoClient.db("YEMPData").collection("MainData").findOne({"name":"user-posts"})
            var getChannelPosts = await mongoClient.db("YEMPData").collection("MainData").findOne({"name":"channel-posts"})
            var getArticlePosts = await mongoClient.db("YEMPData").collection("MainData").findOne({"name":"article-posts"})
            var getVideoPosts = await mongoClient.db("YEMPData").collection("MainData").findOne({"name":"video-posts"})
            var getTopicPosts = await mongoClient.db("YEMPData").collection("MainData").findOne({"name":"topic-posts"})
            var getGroupPosts = await mongoClient.db("YEMPData").collection("MainData").findOne({"name":"group-posts"})
            var getStoryPosts = await mongoClient.db("YEMPData").collection("MainData").findOne({"name":"story-posts"})
            var getMarketPlacePosts = await mongoClient.db("YEMPData").collection("MainData").findOne({"name":"market-place-posts"})
            
            
            
            //extraction 
            let businessPosts = getBusinessPosts.body  
            let userPosts = getUserPosts.body
            let channelPosts = getChannelPosts.body
            let articles = getArticlePosts.body 
            let videoPosts = getVideoPosts.body
            let storyPosts = getStoryPosts.body
            let groupPosts = getGroupPosts.body
            let topicPosts = getTopicPosts.body
            let marketPlacePosts = getMarketPlacePosts.body
            
        const Processor = (postId,userId,commentId,action)=>{
            let output = { 
                "status": null,
                "count" : 0
            }
            
            if(type === "Basic Text Post"){ 
                
                let post = userPosts.findOne((userPosts)=>{
                    return userPosts.id === postId
                })
                
                if(post) {
                
                    if(reply == true){
                        
                        let comments = post.basicDetails.comments 
                        
                        let comment = comments.findOne((comments)=>{
                            comments.id === commentId
                        })
                        
                        if(comment){
                            
                           replies.push(data)
                            
                        }else{
                            output.status = "comment deleted"
                        }
                    
                    }else{
                        
                        let comments = post.basicDetails.comments
                        
                        comments.push(data)
                        
                    }
                }else{
                    output.status = "post deleted"
                }
               
            }
            if(type === "Media Story Post"){ 
                 let post = userPosts.findOne((userPosts)=>{
                    return userPosts.id === postId
                })
                
                if(post) {
                
                    if(reply == true){
                        
                        let comments = post.basicDetails.comments 
                        
                        let comment = comments.findOne((comments)=>{
                            comments.id === commentId
                        })
                        
                        if(comment){
                            
                           replies.push(data)
                            
                        }else{
                            output.status = "comment deleted"
                        }
                    
                    }else{
                        
                        let comments = post.basicDetails.comments
                        
                        comments.push(data)
                        
                    }
                
                }else{
                    output.status = "post deleted"
                }
            } 
            if(type === "Video Post"){ 
                let post = videoPosts.findOne((videoPosts)=>{
                    return videoPosts.id === postId
				})
                
                if(post) {
                
                    if(reply == true){
                        
                        let comments = post.basicDetails.comments 
                        
                        let comment = comments.findOne((comments)=>{
                            comments.id === commentId
                        })
                        
                        if(comment){
                            
                           replies.push(data)
                            
                        }else{
                            output.status = "comment deleted"
                        }
                    
                    }else{
                        
                        let comments = post.basicDetails.comments
                        
                        comments.push(data)
                        
                    }
                
                }else{
                    output.status = "post deleted"
                }
            }
            
            if(type === "Article Post"){ 
                let post = articlePosts.findOne((articlePosts)=>{
                    return articlePosts.id === postId
                })
                
                if(post) {
                
                    if(reply == true){
                        
                        let comments = post.basicDetails.comments 
                        
                        let comment = comments.findOne((comments)=>{
                            comments.id === commentId
                        })
                        
                        if(comment){
                            
                           replies.push(data)
                            
                        }else{
                            output.status = "comment deleted"
                        }
                    
                    }else{
                        
                        let comments = post.basicDetails.comments
                        
                        comments.push(data)
                        
                    }
                
                }else{
                    output.status = "post deleted"
                }
            }
            
            if(type === "Channel Feed Post"){ 
                let post = channelPosts.findOne((channelPosts)=>{

                    return channelPosts.id === postId

                })
                
                if(post) {
                
                    if(reply == true){
                        
                        let comments = post.basicDetails.comments 
                        
                        let comment = comments.findOne((comments)=>{
                            comments.id === commentId
                        })
                        
                        if(comment){
                            
                           replies.push(data)
                            
                        }else{
                            output.status = "comment deleted"
                        }
                    
                    }else{
                        
                        let comments = post.basicDetails.comments
                        
                        comments.push(data)
                        
                    }
                    
                }else{
                    output.status = "post deleted"
                }
            }
            
            if(type === "Market Place Post"){ 
                let post = marketPlacePosts.findOne((marketPlacePosts)=>{
                    return marketPlacePosts.id === postId
                })
                
                if(post) {
                
					if(reply == true){
                        
                        let comments = post.basicDetails.comments 
                        
                        let comment = comments.findOne((comments)=>{
                            comments.id === commentId
                        })
                        
                        if(comment){
                            
                           replies.push(data)
                            
                        }else{
                            output.status = "comment deleted"
                        }
                    
                    }else{
                        
                        let comments = post.basicDetails.comments
                        
                        comments.push(data)
                        
                    }
                
                }else{
                    output.status = "post deleted"
                }
            }
            if(type === "Business Post"){ 
                let post = businessPosts.findOne((businessPosts)=>{

                    return businessPosts.id === postId

                })
                
                if(post) {
                
                   if(reply == true){
                        
                        let comments = post.basicDetails.comments 
                        
                        let comment = comments.findOne((comments)=>{
                            comments.id === commentId
                        })
                        
                        if(comment){
                            
                           replies.push(data)
                            
                        }else{
                            output.status = "comment deleted"
                        }
                    
                    }else{
                        
                        let comments = post.basicDetails.comments
                        
                        comments.push(data)
                        
                    }
                
                }else{
                    output.status = "post deleted"
                }
            }
            if(type === "Story Post"){ 
                let post = storyPosts.findOne((storyPosts)=>{

                    return storyPosts.id === postId

                })
                
                if(post) {
                
                    if(reply == true){
                        
                        let comments = post.basicDetails.comments 
                        
                        let comment = comments.findOne((comments)=>{
                            comments.id === commentId
                        })
                        
                        if(comment){
                            
                           replies.push(data)
                            
                        }else{
                            output.status = "comment deleted"
                        }
                    
                    }else{
                        
                        let comments = post.basicDetails.comments
                        
                        comments.push(data)
                        
                    }
                
                }else{
                    output.status = "post deleted"
                }
            }
            if(type === "Topic Post"){ 
                let post = topicPosts.findOne((topicPosts)=>{

                    return topicPosts.id === postId

                })
                
                if(post) {
                
                   if(reply == true){
                        
                        let comments = post.basicDetails.comments 
                        
                        let comment = comments.findOne((comments)=>{
                            comments.id === commentId
                        })
                        
                        if(comment){
                            
                           replies.push(data)
                            
                        }else{
                            output.status = "comment deleted"
                        }
                    
                    }else{
                        
                        let comments = post.basicDetails.comments
                        
                        comments.push(data)
                        
                    }
                
                }else{
                    output.status = "post deleted"
                }
            }
            if(type === "Group Post"){ 
                let post = groupPosts.findOne((groupPosts)=>{

                    return groupPosts.id === postId

                })
                
                if(post) {
                
                    if(reply == true){
                        
                        let comments = post.basicDetails.comments 
                        
                        let comment = comments.findOne((comments)=>{
                            comments.id === commentId
                        })
                        
                        if(comment){
                            
                           replies.push(data)
                            
                        }else{
                            output.status = "comment deleted"
                        }
                    
                    }else{
                        
                        let comments = post.basicDetails.comments
                        
                        comments.push(data)
                        
                    }
                         
                }else{
                    output.status = "post deleted"
                }
            }
            
            return output

        }
         
         
        let out;
        
        if(type === "Basic Text Post"){ 
            out = Processor(postId,userId,commentId,action)
            await mongoClient.db("YEMPData").collection("MainData").updateOne({"name":"user-posts"},{$set:{"body" : userPosts}})
        }
        if(type === "Media Story Post"){ 
             out = Processor(postId,userId,commentId,action)
             await mongoClient.db("YEMPData").collection("MainData").updateOne({"name":"user-posts"},{$set:{"body" : userPosts}})
        } 
        if(type === "Video Post"){ 
             out = Processor(postId,userId,commentId,action)
             await mongoClient.db("YEMPData").collection("MainData").updateOne({"name":"video-posts"},{$set:{"body" : videoPosts}})
        }
        
        if(type === "Article Post"){ 
             out = Processor(postId,userId,commentId,action)
             await mongoClient.db("YEMPData").collection("MainData").updateOne({"name":"article-posts"},{$set:{"body" : articlePosts}})
        }
        
        if(type === "Channel Feed Post"){ 
             out = Processor(postId,userId,commentId,action)
             await mongoClient.db("YEMPData").collection("MainData").updateOne({"name":"channel-posts"},{$set:{"body" : channelPosts}})
        }
        
        if(type === "Market Place Post"){ 
            out = Processor(postId,userId,commentId,action)
            await mongoClient.db("YEMPData").collection("MainData").updateOne({"name":"market-place-posts"},{$set:{"body" : marketPlacePosts}})
        } 
        if(type === "Business Post"){ 
            out = Processor(postId,userId,commentId,action)
            await mongoClient.db("YEMPData").collection("MainData").updateOne({"name":"business-posts"},{$set:{"body" : businessPosts}})
        }
        if(type === "Story Post"){ 
            out = Processor(postId,userId,commentId,action)
            await mongoClient.db("YEMPData").collection("MainData").updateOne({"name":"story-posts"},{$set:{"body" : storyPosts}})
        }
        if(type === "Group Post"){ 
            groupPosts.push(post)
            await mongoClient.db("YEMPData").collection("MainData").updateOne({"name":"group-posts"},{$set:{"body" : groupPosts}})
        }
        if(type === "Topic Post"){ 
            topicPosts.push(post)
            await mongoClient.db("YEMPData").collection("MainData").updateOne({"name":"topic-posts"},{$set:{"body" : topicPosts}})
        }
        
        
        response.send(JSON.stringify({"status":"success","data":out}))
        
    }catch{
        response.send(JSON.stringify({"status":"server-error"}))
    }
})

app.post("/like-unlike" , async(request,response)=>{
    try{
        let data = request.body
        let userId = data.userId 
        let action = data.action
        let postId = data.postId
        let type = data.type 
        
            var getBusinessPosts = await mongoClient.db("YEMPData").collection("MainData").findOne({"name":"business-posts"}) 
            var getUserPosts = await mongoClient.db("YEMPData").collection("MainData").findOne({"name":"user-posts"})
            var getChannelPosts = await mongoClient.db("YEMPData").collection("MainData").findOne({"name":"channel-posts"})
            var getArticlePosts = await mongoClient.db("YEMPData").collection("MainData").findOne({"name":"article-posts"})
            var getVideoPosts = await mongoClient.db("YEMPData").collection("MainData").findOne({"name":"video-posts"})
            var getTopicPosts = await mongoClient.db("YEMPData").collection("MainData").findOne({"name":"topic-posts"})
            var getGroupPosts = await mongoClient.db("YEMPData").collection("MainData").findOne({"name":"group-posts"})
            var getStoryPosts = await mongoClient.db("YEMPData").collection("MainData").findOne({"name":"story-posts"})
            var getMarketPlacePosts = await mongoClient.db("YEMPData").collection("MainData").findOne({"name":"market-place-posts"})
            
            
            
            //extraction 
            let businessPosts = getBusinessPosts.body  
            let userPosts = getUserPosts.body
            let channelPosts = getChannelPosts.body
            let articles = getArticlePosts.body 
            let videoPosts = getVideoPosts.body
            let storyPosts = getStoryPosts.body
            let groupPosts = getGroupPosts.body
            let topicPosts = getTopicPosts.body
            let marketPlacePosts = getMarketPlacePosts.body
            
        const Processor = (postId,userId,commentId,action)=>{
            let output = { 
                "status": null,
                "count" : 0
            }
            
            if(type === "Basic Text Post"){ 
                
                let post = userPosts.findOne((userPosts)=>{
                    return userPosts.id === postId
                })
                
                if(post) {
                
                        if(action == "like"){
                            
                            let likes = post.likes
                            let search = likes.includes(userId)
                            if(search == true){
                                let index = likes.indexOf(userId)
                                likes.splice(index,1)
                                output.status = "unlike"
                                output.count = likes.length
                            }else{
                                
                                likes.push(userId)
                                output.status = "like"
                                output.count = likes.length
                            }
                        }
                
                }else{
                    output.status = "post deleted"
                }
               
            }
            if(type === "Media Story Post"){ 
                 let post = userPosts.findOne((userPosts)=>{
                    return userPosts.id === postId
                })
                
                if(post) {
                
                        if(action == "like"){
                            
                            let likes = post.likes
                            let search = likes.includes(userId)
                            if(search == true){
                                let index = likes.indexOf(userId)
                                likes.splice(index,1)
                                output.status = "unlike"
                                output.count = likes.length
                            }else{
                                
                                likes.push(userId)
                                output.status = "like"
                                output.count = likes.length
                            }
                        }
                
                }else{
                    output.status = "post deleted"
                }
            } 
            if(type === "Video Post"){ 
                 let post = videoPosts.findOne((videoPosts)=>{
                    return videoPosts.id === postId
                })
                if(post) {
                
                        if(action == "like"){
                            
                            let likes = post.likes
                            let search = likes.includes(userId)
                            if(search == true){
                                let index = likes.indexOf(userId)
                                likes.splice(index,1)
                                output.status = "unlike"
                                output.count = likes.length
                            }else{
                                
                                likes.push(userId)
                                output.status = "like"
                                output.count = likes.length
                            }
                        }
                
                }else{
                    output.status = "post deleted"
                }
            }
            
            if(type === "Article Post"){ 
                let post = articlePosts.findOne((articlePosts)=>{
                    return articlePosts.id === postId
                })
                
                if(post) {
                
                        if(action == "like"){
                            
                            let likes = post.likes
                            let search = likes.includes(userId)
                            if(search == true){
                                let index = likes.indexOf(userId)
                                likes.splice(index,1)
                                output.status = "unlike"
                                output.count = likes.length
                            }else{
                                
                                likes.push(userId)
                                output.status = "like"
                                output.count = likes.length
                            }
                        }
                
                }else{
                    output.status = "post deleted"
                }
            }
            
            if(type === "Channel Feed Post"){ 
                let post = channelPosts.findOne((channelPosts)=>{

                    return channelPosts.id === postId

                })
                if(post) {
                
                        if(action == "like"){
                            
                            let likes = post.likes
                            let search = likes.includes(userId)
                            if(search == true){
                                let index = likes.indexOf(userId)
                                likes.splice(index,1)
                                output.status = "unlike"
                                output.count = likes.length
                            }else{
                                
                                likes.push(userId)
                                output.status = "like"
                                output.count = likes.length
                            }
                        }
                
                }else{
                    output.status = "post deleted"
                }
            }
            
            if(type === "Market Place Post"){ 
                let post = marketPlacePosts.findOne((marketPlacePosts)=>{
                    return marketPlacePosts.id === postId
                })
                
                if(post) {
                
                        if(action == "like"){
                            
                            let likes = post.likes
                            let search = likes.includes(userId)
                            if(search == true){
                                let index = likes.indexOf(userId)
                                likes.splice(index,1)
                                output.status = "unlike"
                                output.count = likes.length
                            }else{
                                
                                likes.push(userId)
                                output.status = "like"
                                output.count = likes.length
                            }
                        }
                
                }else{
                    output.status = "post deleted"
                }
            }
            if(type === "Business Post"){ 
                let post = businessPosts.findOne((businessPosts)=>{

                    return businessPosts.id === postId

                })
                
                if(post) {
                
                        if(action == "like"){
                            
                            let likes = post.likes
                            let search = likes.includes(userId)
                            if(search == true){
                                let index = likes.indexOf(userId)
                                likes.splice(index,1)
                                output.status = "unlike"
                                output.count = likes.length
                            }else{
                                
                                likes.push(userId)
                                output.status = "like"
                                output.count = likes.length
                            }
                        }
                
                }else{
                    output.status = "post deleted"
                }
                
            }
            if(type === "Story Post"){ 
                let post = storyPosts.findOne((storyPosts)=>{

                    return storyPosts.id === postId

                })
                
                                if(post) {
                
                        if(action == "like"){
                            
                            let likes = post.likes
                            let search = likes.includes(userId)
                            if(search == true){
                                let index = likes.indexOf(userId)
                                likes.splice(index,1)
                                output.status = "unlike"
                                output.count = likes.length
                            }else{
                                
                                likes.push(userId)
                                output.status = "like"
                                output.count = likes.length
                            }
                        }
                
                }else{
                    output.status = "post deleted"
                }
            }
            if(type === "Group Post"){ 
                let post = groupPosts.findOne((groupPosts)=>{

                    return groupPosts.id === postId

                })
                
                if(post) {
                
                        if(action == "like"){
                            
                            let likes = post.likes
                            let search = likes.includes(userId)
                            if(search == true){
                                let index = likes.indexOf(userId)
                                likes.splice(index,1)
                                output.status = "unlike"
                                output.count = likes.length
                            }else{
                                
                                likes.push(userId)
                                output.status = "like"
                                output.count = likes.length
                            }
                        }
                
                }else{
                    output.status = "post deleted"
                }
            }
            
            return output

        }
         
         
        let out;
        
        if(type === "Basic Text Post"){ 
            out = Processor(postId,userId,commentId,action)
            await mongoClient.db("YEMPData").collection("MainData").updateOne({"name":"user-posts"},{$set:{"body" : userPosts}})
        }
        if(type === "Media Story Post"){ 
             out = Processor(postId,userId,commentId,action)
             await mongoClient.db("YEMPData").collection("MainData").updateOne({"name":"user-posts"},{$set:{"body" : userPosts}})
        } 
        if(type === "Video Post"){ 
             out = Processor(postId,userId,commentId,action)
             await mongoClient.db("YEMPData").collection("MainData").updateOne({"name":"video-posts"},{$set:{"body" : videoPosts}})
        }
        
        if(type === "Article Post"){ 
             out = Processor(postId,userId,commentId,action)
             await mongoClient.db("YEMPData").collection("MainData").updateOne({"name":"article-posts"},{$set:{"body" : articlePosts}})
        }
        
        if(type === "Channel Feed Post"){ 
             out = Processor(postId,userId,commentId,action)
             await mongoClient.db("YEMPData").collection("MainData").updateOne({"name":"channel-posts"},{$set:{"body" : channelPosts}})
        }
        
        if(type === "Market Place Post"){ 
            out = Processor(postId,userId,commentId,action)
            await mongoClient.db("YEMPData").collection("MainData").updateOne({"name":"market-place-posts"},{$set:{"body" : marketPlacePosts}})
        } 
        if(type === "Business Post"){ 
            out = Processor(postId,userId,commentId,action)
            await mongoClient.db("YEMPData").collection("MainData").updateOne({"name":"business-posts"},{$set:{"body" : businessPosts}})
        }
        if(type === "Story Post"){ 
            out = Processor(postId,userId,commentId,action)
            await mongoClient.db("YEMPData").collection("MainData").updateOne({"name":"story-posts"},{$set:{"body" : storyPosts}})
        }
        if(type === "Group Post"){ 
            groupPosts.push(post)
            await mongoClient.db("YEMPData").collection("MainData").updateOne({"name":"group-posts"},{$set:{"body" : groupPosts}})
        }
        if(type === "Topic Post"){ 
            topicPosts.push(post)
            await mongoClient.db("YEMPData").collection("MainData").updateOne({"name":"topic-posts"},{$set:{"body" : topicPosts}})
        }
        
        response.send(JSON.stringify({"status":"success","data":out}))
        
    }catch{
        response.send(JSON.stringify({"status":"server-error"}))
    }
})

const checkDirectory = (string)=>{
    return fs.existsSync(__dirname+string)
}

function createDirectory(string){
    var output = false
    fs.mkdir(path.join(__dirname+string, (error)=>{
        if(!error) {
            output = true
        }else{
			output = false
		}
    }))
    return output
} 

function createUserDirectories(user){
    var output = false
    var userId = user.userId
    fs.mkdir(path.join(__dirname+`/User Data/${userId}`, (error)=>{
        if(!error) {
            fs.mkdir(path.join(__dirname+`/User Data/${userId}`, (error)=>{
                if(!error){
                    fs.mkdir(path.join(__dirname+`/User Data/${userId}/Images`, (error)=>{
                                        if(!error){
                                            fs.mkdir(path.join(__dirname+`/User Data/${userId}/Videos`, (error)=>{
                                                                if(!error){
                                                                    fs.mkdir(path.join(__dirname+`/User Data/${userId}/Audio`, (error)=>{
                                                                                        if(!error){
                                                                                            fs.mkdir(path.join(__dirname+`/User Data/${userId}/Audio`, (error)=>{

                                                                                                                if(!error){
                        
                                                                                                                    fs.mkdir(path.join(__dirname+`/User Data/${userId}/Data`, (error)=>{
                                                                                                                        fs.mkdir(path.join(__dirname+`/User Data/${userId}/Businesses`, (error)=>{
                                                                                                                            output = true
                                                                                                                        }))
                                                                                                                    }))
                                                                                                                }else{
                                                                                                                    console.log(error)
                                                                                                                }
                                                                                            }))
                                                                                            
                                                                                        }else{
                                                                                            console.log(error)
                                                                                        }
                                                                    }))
                                                                }else{
                                                                    console.log(error)
                                                                }
                                            }))
                                        }else{
                                            console.log(error)
                                        }
                    }))
                }else{
                    console.log(error)
                }
            }))
        }
    }))
    
    return output
}

function createBusinessDirectories(userId,businessId){
    let output = false
    let createBase = createDirectory(`User Data/${userId}/Businesses/${businessId}`)
    if(createBase == true){
        let createImages = createDirectory(`User Data/${userId}/Businesses/${businessId}/Images`)

        if(createImages == true){
    
            let createVideos = createDirectory(`User Data/${userId}/Businesses/${businessId}/Videos`)
            if(createVideos == true){
                let createAudio = createDirectory(`User Data/${userId}/Businesses/${businessId}/Audio`)
                if(createAudio == true){
                    let createData = createDirectory(`User Data/${userId}/Businesses/${businessId}/Data`)

                    if(createData == true){
                        output = true
                    }else{
						output = false
					}
                  
                }
            }
            
        }
    }
    return output
}

async function addNewUser(userData){
    
    let output = false

    try{
        
        let user = {
            userId: userData.userId,
            firstName: userData.firstName,
            lastName: userData.lastName,
            password:userData.password,
            emailAddress:userData.emailAddress,
            secretQuestion: userData.secretQuestion,
            secretQuestionAnswer: userData.secretQuestionAnswer,
            addressDetails:userData.AddressDetails,
            preferences: userData.UserSettings,
            currentProfileImage: null,
            currentLocation: null,
            occupation:userData.occupation,  
            relationShipStatus: userData.relationShipStatus,
            gender: userData.gender,   
            otherHandles: [],
            dateOfBirth: userData.dateOfBirth,
            dateCreated: userData.dateCreated,
            profanities: [],
            pagesFollowed: [],
            interests: [],
            viewedPosts: [],
            friends: [],
            posts: [],
            conversations: [],
            notifications: [],
            linkupRequests:[],
            deliverMeQueue:[],
            schoolsAttended:[],
            tickets:[],
            dateModified: userDate.dateCreated,
            fileDeleted: false
        
        } 
        
        let getUsers = await mongoClient.db("YEMPData").collection("MainData").findOne({"name":"user-profiles"}) 
        let users = getUsers.body 
        users.push(user)
    
        await mongoClient.db("YEMPData").collection("MainData").updateOne({"name":"user-profiles"} , {$set: {"body":users}})
        
        createUserDirectories(userId)
        
        output = true
        
    }catch{
        output = "error"
    }
}

async function getUser(userId) {
    var output = null
    try{
        let get_users = await mongoClient.db("YEMPData").collection("MainData").findOne({"name":"user-profiles"})
        let users = get_users.body 
        let user = users.find((users)=>{
            return users.userId === userId
        })
    }catch{
        
    }
    return output
}

async function updateUser(userData) {
    var output = null
    try{
        let get_users = await mongoClient.db("YEMPData").collection("MainData").findOne({"name":"user-profiles"})
        let users = get_users.body 
        let index = users.findIndex((users)=>{
            return users.userId === userId
        })
        users[index] = userData
        await mongoClient.db("YEMPData").collection("MainData").updateOne({"name":"user-profiles"} , {$set: {"body":users}}) 
        
    }catch{
        
    }
    return output
} 

app.post("/login-user" , async( request, response)=>{
    
    try{
        let data = request.body
        let email = data.email
        let password = data.password 
        
		console.log(data)
		
        let getUsers = await mongoClient.db("YEMPData").collection("MainData").findOne({"name":"user-profiles"})
        
        let users = getUsers.body 
        
        let search = users.find((users)=>{
            return users.emailAddress === email
        })
        
        if(!search){
            response.send(JSON.stringify({"status" : "no-user"}))
        }else{
            
            let password2 = search.password
            
            if(password === password2){
                await activateUserSocket(search.userId)               
				response.send(JSON.stringify({"status" : "success"}))
            }else{
                response.send(JSON.stringify({"status" : "wrong-password"}))
            }
            
        }
        
    }catch{
        response.send(JSON.stringify({"status" : "server-error"}))
    }
})

app.post("/logout-user" , async( request, response)=>{
    
    try{
        let data = request.body
        let userId = data.userId
        
        let getUsers = await mongoClient.db("YEMPData").collection("MainData").findOne({"name":"user-sockets"})
        
        let users = getUsers.body 
        
        let search = users.find((user)=>{
            return users.userId === userId
        })
        
        search.active = false

        await updateActiveSockets(users)
        
        response.send(JSON.stringify({"status" : "success"}))
        
    }catch{
        response.send(JSON.stringify({"status" : "server-error"}))
    }
    
})

app.post("/change-user-password" , async( request,response )=>{
    
    try{
        let data = request.body

        let userId = data.accessorId
		
		let loginConsoleMode = data.loginConsoleMode

        let socketCheck = await checkIfSocketActive(userId)
        
        if( socketCheck == true ){
			if(loginConsoleMode == "Non Admin"){
				            
				let password = data.password 
			
				let getUsers = await mongoClient.db("YEMPData").collection("MainData").findOne({"name":"user-profiles"})
				
				let users = getUsers.body 
				
				let search = users.find((users)=>{
					return users.userId === userId
				})
				
				search.password = password
				
				await mongoClient.db("YEMPData").collection("MainData").updateOne({"name":"user-profiles"},{$set:{"body":users}})
				
				response.send(JSON.stringify({"status" : "success"}))
			
			}else{
				
				let password = data.password 
			
				let getController = await mongoClient.db("YEMPData").collection("AdminOnlyInfo").findOne({"name":"admin-controller-data"})
				
				let admins = getUsers.admins 
				
				let search = admins.find((admins)=>{
					return admins.adminId === userId
				})
				
				search.password = password
				
				await mongoClient.db("YEMPData").collection("AdminOnlyInfo").updateOne({"name":"admin-controller-data"},{$set:{"body":admins}})
				
				response.send(JSON.stringify({"status" : "success"}))
				
			}
        }else{
			response.sendStatus(404)
		}

        
    }catch{
        response.send(JSON.stringify({"status" : "server-error"}))
    }
    
})

app.post("/change-user-secret-answer" , async( request,response )=>{
    
    try{
        let data = request.body

        let userId = data.userId

        let socketCheck = await checkIfSocketActive(userId)
        
        if( socketCheck == true ){
            
            let secretQuestion = data.secretQuestion
            let secretQuestionAnswer = data.secretQuestionAnswer
        
            let getUsers = await mongoClient.db("YEMPData").collection("MainData").findOne({"name":"user-profiles"})
            
            let users = getUsers.body 
            
            let search = users.find((users)=>{
                return users.userId === userId
            })
            
            search.secretQuestion = secretQuestion
            search.secretQuestionAnswer = secretQuestionAnswer
            
            await mongoClient.db("YEMPData").collection("MainData").updateOne({"name":"user-profiles"},{$set:{"body":users}})
            
            response.send(JSON.stringify({"status" : "success"}))
        }

        
    }catch{
        response.send(JSON.stringify({"status" : "server-error"}))
    }
    
})

app.post("/get-secret-question", async(request,response)=>{
    try{
        let data = request.body

        let email = data.emailAddress
		let consoleMode = data.loginConsoleMode 

        let socketCheck = await checkIfSocketActive(userId)
        
        if( socketCheck == true ){
            if(loginConsoleMode === "Non Admin"){
				let getUsers = await mongoClient.db("YEMPData").collection("MainData").findOne({"name":"user-profiles"})
				
				let users = getUsers.body 
				
				let search = users.find((users)=>{
					return users.emailAddress === emailAddress
				})
				
				if(search){
					response.send(JSON.stringify({"status" : "success","q": search.secretQuestion}))
				}else{
					response.send(JSON.stringify({"status" : "error"}))
				}
            }else{
				let getController = await mongoClient.db("YEMPData").collection("AdminOnlyInfo").findOne({"name":"admin-controller-data"})
				
				let admins = getUsers.admins 
				
				let search = admins.find((admins)=>{
					return admins.emailAddress === emailAddress
				})
				
				if(search){
					response.send(JSON.stringify({"status" : "success","q": search.secretQuestion}))
				}else{
					response.send(JSON.stringify({"status" : "error"}))
				}
			}
        }

        
    }catch{
        response.send(JSON.stringify({"status" : "server-error"}))
    }
    
})

app.post("/validate-secret-question", async(request,response)=>{
	try{
		
		let data = request.body 
		
		let accessorId = data.accessorId 
		
		let loginConsoleMode = data.loginConsoleMode
		
		let check = await checkIfSocketActive(accessorId)
		
		if(check == true){
			
			if(loginConsoleMode === "Non Admin"){
				let getUsers = await mongoClient.db("YEMPData").collection("MainData").findOne({"name":"user-profiles"})
				let users = getUsers.body 
				
				let user = users.find((users)=>{
					return users.userId == accessorId
				})
				
				if(user){
					response.send(JSON.stringify({"status":"success","data":user}))
				}else{
					response.send(JSON.stringify({"status":"user-not-found"}))
				}
			}else{
				let getController = await mongoClient.db("YEMPData").collection("AdminOnlyInfo").findOne({"name":"admin-controller-data"})
				let admins = getController.admins 
				
				let admin = admins.find((admins)=>{
					return admins.adminId == accessorId
				})
				
				if(admin){
					response.send(JSON.stringify({"status":"success","data":admin}))
				}else{
					response.send(JSON.stringify({"status":"user-not-found"}))
				}
			}
			
		}else{
			response.sendStatus(404)
		}
		
	}catch{
		response.send(JSON.stringify({"status":"server-error"}))
	}
})

app.post("/change-user-names" , async( request,response )=>{
    try{
        let data = request.body

        let userId = data.userId

        let socketCheck = await checkIfSocketActive(userId)
        
        if( socketCheck == true ){

            let firstName = data.firstName
            let lastName = data.lastName
            let nickName = data.nickName
        
            let getUsers = await mongoClient.db("YEMPData").collection("MainData").findOne({"name":"user-profiles"})
            
            let users = getUsers.body 
            
            let search = users.find((users)=>{
                return users.userId === userId
            })
            
            search.firstName = firstName
            search.lastName = lastName
            search.nickName = nickName
            
            await mongoClient.db("YEMPData").collection("MainData").updateOne({"name":"user-profiles"},{$set:{"body":users}})
            
            response.send(JSON.stringify({"status" : "success"}))
        }

        
    }catch{
        response.send(JSON.stringify({"status" : "server-error"}))
    }
    
})

const SignupUser = async( input )=>{
    let output;
    try{
        Users = await mongoClient.db("YEMPData").collection("MainData").findOne({"name" : "user-profiles"})
        
        let email = input.emailAddress 
       
        let users = getUsers.body
        
        let search = users.find((users)=>{
            return user.emailAddress === email
        })
        
        let newUser = {
            userId: input.userId,
            firstName: input.firstName,
            lastName: input.lastName,
            password:input.password,
            emailAddress:input.emailAddress,
            secretQuestion: input.secretQuestion,
            secretQuestionAnswer: input.secretQuestionAnswer,
            addressDetails:input.AddressDetails,
            preferences: input.UserSettings,
            currentProfileImage: null,
            currentLocation: input.city,
            occupation: input.occupation,
            relationShipStatus: null,
            gender: input.gender, 
            otherHandles:[],
            dateOfBirth: input.dateOfBirth,
            dateCreated: input.dateCreated,
            profanities: [],
            pagesFollowed: [],
            interests: [],
            viewedPosts: [],
            friends: [],
            posts: [],
            conversations: [],
            notifications: [],
            linkupRequests: [],
            deliverMeQueue: [],
            schoolsAttended: [],
            tickets:[],
            dateModified: input.dateModified, 
            fileDeleted: Boolean = false,
            discussions: [],
            businesses: [],
            groups: []
        }
        
        if( !search ){
            
            users.push(newUser)
            await mongoClient.db("YEMPData").collection("MainData").updateOne({"name" : "user-profiles"},{$set:{"body":users}})
            output = "success"
            
        }else{
            output = "email-exists"
        }
        
    }catch{
        output = "server-error"
    }
    
    return output
}

app.post("/sign-up-user",async(request,response)=>{
    try{
        let data = request.body
        let process = await SignupUser(data.userData)
        if( process == "success" ){
			response.send(JSON.stringify({"status" : "success"}))
        }else{
            response.send(JSON.stringify({"status" : process}))
        }
    }catch{
        response.send(JSON.stringify({"status" : "server-error"}))
    }
})

const AddNewBusiness = async(input,userId)=>{
	
    let output = null 
    
    try{
        
        let getUsers = await mongoClient.db("YEMPData").collection("MainData").findOne({"name" : "user-profiles"})
        let getBusinesses = await mongoClient.db("YEMPData").collection("MainData").findOne({"name" : "user-businesses"})

        let users = getUsers.body
        let businesses = getBusinesses.body
        
        let search = users.find((users)=>{
            return user.userId === userId
        })
        
        let newBiz = {
            
                businessId: input.businessId,
                owner: input.owner,
                physicalAddress: input.AddressDetails,
                businessName: input.businessName,
                businessAdmins: [],
                catalogue : [],
                posts: [],
                description: input.description,
                type : input.type,
                followers: [],
                buyers: [], 
				conversations:[],
                contactNumber: input.contactNumber,
                emailAddress: input.emailAddress,
                category: input.catgory,
                usersLog: [],
                events: [],
                eventAttendances: [],
                visitors: [],
                subscriptions: [],
                digitalProducts: [],
                ticketSales: [],
                publishedVideos: [],
                publishedArticles: [],
                historicalData:[],
                preferences : input.BusinessSettings,
                fileDeleted: false,
                dateModified: input.dateModified,
                discussions:[],
                groups:[]
                    
        }
        
        if( search ){
            
            businesses.push(newBiz)
            user.businesses.push(newBiz.businessId)
            await mongoClient.db("YEMPData").collection("MainData").updateOne({"name" : "user-profiles"},{$set:{"body":users}})
            await mongoClient.db("YEMPData").collection("MainData").updateOne({"name" : "user-businesses"},{$set:{"body":businesses}})
            output = "success"
            
        }else{
            output = "user-non-existent"
        }
        
    }catch{
        output = "server-error"
    }
    
    return output 
	
}

app.post("/get-fresh-business-data",async(request,response)=>{
    try{
        let data = request.body 
        let accessorId = data.accessorId
        let businessId = data.businessId

        let socketCheck = await checkIfSocketActive(accessorId)
        
        if(socketCheck == true){

            let process = await GetBusinessData(businessId)
            if( process){
                response.send(JSON.stringify({"status" : "success", "data": process}))
            }else{
                response.send(JSON.stringify({"status" : "server-error"}))
            }
            
        }
    }catch{
        response.send(JSON.stringify({"status" : "server-error"}))
    }
})

app.post("/get-fresh-group-data",async(request,response)=>{
    try{
        let data = request.body 
        let accessorId = data.accessorId
        let groupId = data.groupId

        let socketCheck = await checkIfSocketActive(accessorId)
        
        if(socketCheck == true){

            let process = await GetGroupData(groupId)
            if( process){
                response.send(JSON.stringify({"status" : "success", "data": process}))
            }else{
                response.send(JSON.stringify({"status" : "server-error"}))
            }
            
        }
    }catch{
        response.send(JSON.stringify({"status" : "server-error"}))
    }
})


app.post("/ -user-data",async(request,response)=>{
    try{
        let data = request.body 
        let accessorId = data.accessorId
        
        let socketCheck = await checkIfSocketActive(accessorId)
        
        if(socketCheck == true){

            let process = await GetUserData(accessorId)
            if( process){
                response.send(JSON.stringify({"status" : "success", "data": process}))
            }else{
                response.send(JSON.stringify({"status" : "server-error"}))
            }
            
        }
    }catch{
        response.send(JSON.stringify({"status" : "server-error"}))
    }
})


const AddNewGroup = async(input,userId)=>{
    let output = null 
    
    try{
        
        let getUsers = await mongoClient.db("YEMPData").collection("MainData").findOne({"name" : "user-profiles"})
        let getGroups = await mongoClient.db("YEMPData").collection("MainData").findOne({"name" : "user-groups"})

        let users = getUsers.body
        let groups = getGroups.body
        
        let search = users.find((users)=>{
            return user.userId === userId
        })
        
        let newGroup = {
            
                groupId: input.businessId,
                owner: input.owner,
                physicalAddress: input.AddressDetails,
                groupName: input.groupName,
                admins: [],
                pendingJoin : [],
                posts: [],
                pendingPosts: [],
                description: input.description,
                type : input.type,
                followers: [],
                category: input.catgory,
                usersLog: [],
                events: [],
                eventAttendances: [],
                visitors: [],
                publishedVideos: [],
                publishedArticles: [],
                preferences : input.GroupSettings,
                fileDeleted: false,
                dateModified: input.dateModified,
                discussions:[]
                    
        }
        
        if( search ){
            
            groups.push(newGroup)
            user.businesses.push(newBiz.businessId)
            await mongoClient.db("YEMPData").collection("MainData").updateOne({"name" : "user-profiles"},{$set:{"body":users}})
            await mongoClient.db("YEMPData").collection("MainData").updateOne({"name" : "user-groups"},{$set:{"body":businesses}})
            output = "success"
            
        }else{
            output = "user-non-existent"
        }
        
    }catch{
        output = "server-error"
    }
    
    return output 
}

const GetGroupData = async(groupId)=>{
	let output;
	
	try{
		let getGroups = await mongoClient.db("YEMPData").collection("MainData").findOne({"name" : "user-groups"})
		let groups = getGroups.body
		
		let search = groups.find((groups)=>{
			return groups.groupId === groupId
		})
		
		if(search){
			output = search
		}
		
	}catch{
		output = null
	}
	
	return output 
	
}

app.post("/add-new-business",async(request,response)=>{
    try{
        let data = request.body 
        let userId = data.userId

        let socketCheck = await checkIfSocketActive(userId)
        
        if(socketCheck == true){

            let process = await AddNewBusiness(data.businessData,userId)
            if( process == "success" ){
                response.send(JSON.stringify({"status" : "success"}))
            }else{
                response.send(JSON.stringify({"status" : process}))
            }
            
        }
    }catch{
        response.send(JSON.stringify({"status" : "server-error"}))
    }
})

app.get("/get-user-video/:id", async(request,response)=>{
    try{ 
        let userId = request.params.id
        let checkSocket = await checkIfSocketActive(userId) 
        if(checkSocket == true){
            let socket = await getUserSocket(userId)
            let mediaId = socket.mediaId
            let mediaFormat = socket.mediaFormat
            let ownerId = socket.ownerId
            let stream = fs.createReadStream(__dirname+`/User Data/${ownerId}/Videos/${mediaId}.${mediaFormat}`)
            stream.pipe(response)
        }else{
            response.sendStatus(404)
        }
    }catch{
        response.send(JSON.stringify({"status" : "server-error"}))
    }
}) 

app.get("/get-user-image/:id", async(request,response)=>{
    try{
        let userId = request.params.id
        if(await checkIfSocketActive(userId) == true){
            let socket = await getUserSocket(userId)
            let mediaId = socket.mediaId
            let mediaFormat = socket.mediaFormat
            let ownerId = socket.ownerId
            let stream = fs.createReadStream(__dirname+`/User Data/${ownerId}/Images/${mediaId}.${mediaFormat}`)
            stream.pipe(response)
        }else{
            response.sendStatus(404)
        }
    }catch{
        response.send(JSON.stringify({"status" : "server-error"}))
    }
}) 

app.get("/get-user-audio/:id", async(request,response)=>{
    try{
        let userId = request.params.id
        let checkSocket = await checkIfSocketActive(userId)
        if(checkSocket == true){
            let socket = await getUserSocket(userId)
            let mediaId = socket.mediaId
            let mediaFormat = socket.mediaFormat
            let ownerId = socket.ownerId
            let stream = fs.createReadStream(__dirname+`/User Data/${ownerId}/Audio/${mediaId}.${mediaFormat}`)
            stream.pipe(response)
        }else{
            response.sendStatus(404)
        }
    }catch{
        response.send(JSON.stringify({"status" : "server-error"}))
    }
}) 

app.get("/get-user-data/:id", async(request,response)=>{
    try{
        let userId = request.params.id
        let checkSocket = await checkIfSocketActive(userId) 
        if( checkSocket == true){
            let socket = await getUserSocket(userId)
            let mediaId = socket.mediaId
            let mediaFormat = socket.mediaFormat
            let ownerId = socket.ownerId
            let stream = fs.createReadStream(__dirname+`/User Data/${ownerId}/Data/${mediaId}.${mediaFormat}`)
            stream.pipe(response)
        }else{
            response.sendStatus(404)
        }
    }catch{
        response.send(JSON.stringify({"status" : "server-error"}))
    }
}) 

app.get("/delete-user-video/:id", async(request,response)=>{
    try{ 
        let userId = request.params.id
        let checkSocket = await checkIfSocketActive(userId) 
        if(checkSocket == true){
            let socket = await getUserSocket(userId)
            let mediaId = socket.mediaId
            let mediaFormat = socket.mediaFormat
            let ownerId = socket.ownerId
            fs.deleteFileSync(__dirname+`/User Data/${ownerId}/Videos/${mediaId}.${mediaFormat}`)
            response.send(JSON.stringify({"status": true}))
        }else{
            response.sendStatus(404)
        }
    }catch{
        response.send(JSON.stringify({"status" : "server-error"}))
    }
}) 

app.get("/delete-user-image/:id", async(request,response)=>{
    try{
        let userId = request.params.id
        if(await checkIfSocketActive(userId) == true){
            let socket = await getUserSocket(userId)
            let mediaId = socket.mediaId
            let mediaFormat = socket.mediaFormat
            let ownerId = socket.ownerId
            fs.deleteFileSync(__dirname+`/User Data/${ownerId}/Images/${mediaId}.${mediaFormat}`)
            response.send(JSON.stringify({"status": true}))
        }else{
            response.sendStatus(404)
        }
    }catch{
        response.send(JSON.stringify({"status" : "server-error"}))
    }
}) 

app.get("/delete-user-audio/:id", async(request,response)=>{
    try{
        let userId = request.params.id
        let checkSocket = await checkIfSocketActive(userId)
        if(checkSocket == true){
            let socket = await getUserSocket(userId)
            let mediaId = socket.mediaId
            let mediaFormat = socket.mediaFormat
            let ownerId = socket.ownerId
            fs.deleteFileSync(__dirname+`/User Data/${ownerId}/Audio/${mediaId}.${mediaFormat}`)
            response.send(JSON.stringify({"status": true}))
        }else{
            response.sendStatus(404)
        }
    }catch{
        response.send(JSON.stringify({"status" : "server-error"}))
    }
}) 

app.get("/delete-user-data/:id", async(request,response)=>{
    try{
        let userId = request.params.id
        let checkSocket = await checkIfSocketActive(userId) 
        if( checkSocket == true){
            let socket = await getUserSocket(userId)
            let mediaId = socket.mediaId
            let mediaFormat = socket.mediaFormat
            let ownerId = socket.ownerId
            fs.deleteFileSync(__dirname+`/User Data/${ownerId}/Data/${mediaId}.${mediaFormat}`)
            response.send(JSON.stringify({"status": true}))
        }else{
            response.sendStatus(404)
        }
    }catch{
        response.send(JSON.stringify({"status" : "server-error"}))
    }
}) 

app.get("/get-business-video/:id", async(request,response)=>{
    try{
        let userId = request.params.id
        let checkSocket = await checkIfSocketActive(userId)
        if(checkSocket == true){
            let socket = await getUserSocket(userId)
            let ownerId = socket.ownerId
            let businessId = socket.businessId
            let mediaId = socket.mediaId
            let mediaFormat = socket.mediaFormat
            let stream = fs.createReadStream(__dirname+`/User Data/${ownerId}/Businesses/${businessId}/Videos/${mediaId}.${mediaFormat}`)
            stream.pipe(response)
        }else{
            response.sendStatus(404)
        }
    }catch{
        response.send(JSON.stringify({"status" : "server-error"}))
    }
}) 

app.get("/get-business-image/:id", async(request,response)=>{
    try{
        let userId = request.params.id
        let checkSocket = await checkIfSocketActive(userId)
        if(checkSocket == true){
           let socket = await getUserSocket(userId)
            let ownerId = socket.ownerId
            let businessId = socket.businessId
            let mediaId = socket.mediaId
            let mediaFormat = socket.mediaFormat
            let stream = fs.createReadStream(__dirname+`/User Data/${userId}/Businesses/${businessId}/Images/${mediaId}.${mediaFormat}`)
            stream.pipe(response)
        }else{
            response.sendStatus(404)
        }
    }catch{
        response.send(JSON.stringify({"status" : "server-error"}))
    }
}) 

app.get("/get-business-audio/:id", async(request,response)=>{
    try{
        let userId = request.params.id
        let checkSocket = await checkIfSocketActive(userId) 
        if( checkSocket == true){
           let socket = await getUserSocket(userId)
            let ownerId = socket.ownerId
            let businessId = socket.businessId
            let mediaId = socket.mediaId
            let mediaFormat = socket.mediaFormat
            let stream = fs.createReadStream(__dirname+`/User Data/${userId}/Businesses/${businessId}/Audio/${mediaId}.${mediaFormat}`)
            stream.pipe(response)
        }else{
            response.sendStatus(404)
        }
    }catch{
        response.send(JSON.stringify({"status" : "server-error"}))
    }
}) 

app.get("/get-business-data/:id", async(request,response)=>{

    try{

        let userId = request.params.id
        let socketCheck = await checkIfSocketActive(userId)
        if(socketCheck == true){
           let socket = await getUserSocket(userId)
            let ownerId = socket.ownerId
            let businessId = socket.businessId
            let mediaId = socket.mediaId
            let mediaFormat = socket.mediaFormat
            let stream = fs.createReadStream(__dirname+`/User Data/${userId}/Businesses/${businessId}/Data/${mediaId}.${mediaFormat}`)
            stream.pipe(response)
        }else{
            response.sendStatus(404)
        }
    }catch{
        response.send(JSON.stringify({"status" : "server-error"}))
    }
}) 

app.get("/delete-business-video/:id", async(request,response)=>{
    try{
        let userId = request.params.id
        let checkSocket = await checkIfSocketActive(userId)
        if(checkSocket == true){
            let socket = await getUserSocket(userId)
            let ownerId = socket.ownerId
            let businessId = socket.businessId
            let mediaId = socket.mediaId
            let mediaFormat = socket.mediaFormat
            fs.deleteFileSync(__dirname+`/User Data/${ownerId}/Businesses/${businessId}/Videos/${mediaId}.${mediaFormat}`)
            response.send(JSON.stringify({"status": true}))
        }else{
            response.sendStatus(404)
        }
    }catch{
        response.send(JSON.stringify({"status" : "server-error"}))
    }
}) 

app.get("/delete-business-image/:id", async(request,response)=>{
    try{
        let userId = request.params.id
        let checkSocket = await checkIfSocketActive(userId)
        if(checkSocket == true){
           let socket = await getUserSocket(userId)
            let ownerId = socket.ownerId
            let businessId = socket.businessId
            let mediaId = socket.mediaId
            let mediaFormat = socket.mediaFormat
            fs.createReadStream(__dirname+`/User Data/${userId}/Businesses/${businessId}/Images/${mediaId}.${mediaFormat}`)
            response.send(JSON.stringify({"status": true}))
        }else{
            response.sendStatus(404)
        }
    }catch{
        response.send(JSON.stringify({"status" : "server-error"}))
    }
}) 

app.get("/delete-business-audio/:id", async(request,response)=>{
    try{
        let userId = request.params.id
        let checkSocket = await checkIfSocketActive(userId) 
        if( checkSocket == true){
           let socket = await getUserSocket(userId)
            let ownerId = socket.ownerId
            let businessId = socket.businessId
            let mediaId = socket.mediaId
            let mediaFormat = socket.mediaFormat
            fs.deleteFileSync(__dirname+`/User Data/${userId}/Businesses/${businessId}/Audio/${mediaId}.${mediaFormat}`)
            response.send(JSON.stringify({"status": true}))
        }else{
            response.sendStatus(404)
        }
    }catch{
        response.send(JSON.stringify({"status" : "server-error"}))
    }
}) 

app.get("/delete-business-data/:id", async(request,response)=>{

    try{

        let userId = request.params.id
        let socketCheck = await checkIfSocketActive(userId)
        if(socketCheck == true){
           let socket = await getUserSocket(userId)
            let ownerId = socket.ownerId
            let businessId = socket.businessId
            let mediaId = socket.mediaId
            let mediaFormat = socket.mediaFormat
            fs.deleteFileSync(__dirname+`/User Data/${userId}/Businesses/${businessId}/Data/${mediaId}.${mediaFormat}`)
            response.send(JSON.stringify({"status": true}))
        }else{
            response.sendStatus(404)
        }
    }catch{
        response.send(JSON.stringify({"status" : "server-error"}))
    }
}) 

app.post("/check-conversation-existence", async(request,response)=>{
	    
		try{
			let output = null
	    
			let data = request.body
			
			let accessorId = data.accessorId 
			let businessId = null
			
			let socketCheck = checkIfSocketActive(accessorId)
			
			if(socketCheck == true){
				
				let output = {
					"sender":"none",
					"reciever":"none"
				}
				
				if(data.businessId){
					businessId = data.businessId
				}
				
				let recieverId = data.recieverId 
				let senderId = data.senderId
				
				//get database data
				
				let getUsers = await mongoClient.db("YEMPData").collection("MainData").findOne({"name":"user-profiles"})
				let users = getUsers.body 
				
				let getBusinesses = await mongoClient.db("YEMPData").collection("MainData").findOne({"name":"business"})
				
				//find sender and reciever
				let sender = users.find((users)=>{
					return users.userId === senderId
				})
				let conversations1 = sender.conversations 

				let reciever = users.find((users)=>{
					return users.userId === recieverId
				})
				let conversations2 = reciever.conversations 
				
				//check sender conversations 
				let check1 = conversations1.find((conversations1)=>{
					return conversations1.recieverId === reciever
				})
				
				//check reciever conversations
				let check2 = conversations2.find((conversations2)=>{
					return conversations2.recieverId === sender
				})
				
				if(check1){
					output.sender = "exists"
				}
				if(check2){
					output.reciever = "exists"
				}
				
				response.send(JSON.stringify({"status": "success" , "output" : output}))
			
			}else{
				response.sendStatus(404)
			}
		
			
			
		}catch{
			response.send(JSON.stringify({"status": "server-error"}))
		}
	    
		
	})
	
	app.post("/send-complaint",async(request,response)=>{
		try{
			
			let data = request.body 
			
			let accessorId = data.accessorId
			let complaint = data.complaint 
			
			let socketCheck = await checkIfSocketActive(accessorId)
			if(socketCheck == true){
				
				let getAdminData = await mongoClient.db("YEMPData").collection("AdminOnlyInfo").findOne({"name":"admin-controller-data"})
				let adminData = getAdminData.body 
				
				let complaints = adminData.complaints 
				
				let search = complaints.find((complaints)=>{
					return complaints.id === complaint.id
				})
				
				if(search){
				
					response.send(JSON.stringify({"status":"complaint-exists"}))
				
				}else{
					
					complaints.push(complaint)
					
					response.send(JSON.stringify({"status":"success"}))
					
				}
				
			}else{
				response.sendStatus(404)
			}
			
			
		}catch{
			response.send(JSON.stringify({"status":"server-error"}))
		}
	})


	//Account update requests and responses

	app.post("/update-group-data",async(request,response)=>{
		
		try{
			
			let data = request.body 
			
			let accessorId = data.accessorId 
			let groupData = data.groupData 
			let socketCheck = await checkIfSocketActive(accessorId)
			
			if(socketCheck == true){
				
				let getGroups = await mongoClient.db("YEMPData").collection("MainData").findOne({"name":"user-groups"});
				let groups = getGroups.body;
				
				let index = groups.findIndex((businesses)=>{
					return groups.groupId === groupData.groupId
				});
				
				groups[index] = groupData 
				
				await mongoClient.db("YEMPData").collection("MainData").updateOne({"name":"user-groups"},{$set:{"body":groups}})
				
				response.send(JSON.stringify({"status":"success"}))
				
			}else{
				response.sendStatus(404)
			}
			
		}catch{
			response.send(JSON.stringify({"status":"server-error"}))
		}
		
	})

	let businessQueue = []

	app.post("/update-business-data", async(request,response)=>{
		try{
			
			let data = request.body 
			
			let accessorId = data.accessorId 
			let businessData = data.businessData 
			let socketCheck = await checkIfSocketActive(accessorId)
			
			if(socketCheck == true){
				
				businessQueue.push(businessData)
				response.send(JSON.stringify({"status":"success"}))
				
			}else{
				response.sendStatus(404)
			}
			
			
		}catch{
			response.send(JSON.stringify({"status":"server-error"}))
		}
	})

	let usersQueue = []

	app.post("/update-user-data", async(request,response)=>{
		try{
			
			let data = request.body 
			
			let accessorId = data.accessorId 
			let userData = data.userData 
			let socketCheck = await checkIfSocketActive(accessorId)
			
			if(socketCheck == true){
				
				usersQueue.push(userData)
				response.send(JSON.stringify({"status":"success"}))
				
			}else{
				response.sendStatus(404)
			}
			
			
		}catch{
			response.send(JSON.stringify({"status":"server-error"}))
		}
	})
	
	app.post("/sign-up-admin", async(request,response)=>{
		try{
			
			let data = request.body 
			
			let emailAddress = data.emailAddress 
			
			let getData = await mongoClient.db("YEMPData").collection("AdminOnlyInfo").findOne({"name":"admin-controller-data"});
			
			let adminData = getData.body
			
			let admins = adminData.admins 
			
			let search = admins.find((admins)=>{
				return admins.emailAddress === emailAddress
			})
			
			if(search){
				response.send(JSON.stringify({"status":"email-exists"}))
			}else{
				
				
				admins.push(data)
				
				createUserDirectories(data.adminId)
				addUserSocket(data.adminId)
				
				await mongoClient.db("YEMPData").collection("AdminOnlyInfo").updateOne({"name":"admin-controller-data"},{$set:{"body":adminData}});
				
				response.send(JSON.stringify({"status":"success"}))
			}
			
		}catch{
			response.send(JSON.stringify({"status":"server-error"}))
		}
	})
	
	//Search Call Responses 
	
	async function evalPostData(post,input){
		let output = false 
		let regex = new RegExp(input)
		
		if(post.classType == "BasicTextPost"){
			output = regex.test(post.text)
		}
		if(post.classType == "BusinessPost"){
			output = regex.test(post.text)
		}
		if(post.classType == "MediaPost"){
			output = regex.test(post.caption)
		}
		if(post.classType == "MarketPlacePost"){
			let q1 = regex.test(post.description)
			let q2 = regex.test(post.name)
			if(q1 == true || q2 == true){
				output = true
			}
		}
		if(post.classType == "ReligiousPost"){
			let q1 = regex.test(post.message)
			let q2 = regex.test(post.title)
			if(q1 == true || q2 == true){
				output = true
			}
		}
		if(post.classType == "Video"){
			let q1 = regex.test(post.title)
			let q2 = regex.test(post.description)
			if(q1 == true || q2 == true){
				output = true
			}
		}
		if(post.classType == "VideoPlaylist"){
			if(post.private == false){				
				output = regex.test(post.playlistName)
			}
		}
		
		return output
	}
	
	async function searchCollection(array,input){
		let output = []
		
		for(var i=0; i<array.length; i++){
			let x = array[i]
			let evaluator = await evalPostData(x,input)
			if(evaluator == true){
				output.push(x)
			}
		}
		
		return output
	}
	
	async function consiolidateCollections(collectionsArray){
		let output = []
		
		for(var x=0; x<collectionsArray.length; x++){
			
			let array = collectionsArray[x]
			
			for(var y=0; y<array.length; y++){
				output.push(array[y])
			}
			
		}
		
		return output
	}
	
	app.post("/search-all-posts", async(request,response)=>{
		try{
			
			let data = request.body 
			let accessorId = data.accessorId 
			let searchInput = data.searchInput
			let socketCheck = await checkIfSocketActive(accessorId)
			if(socketCheck == true){
				
				let getUserPosts = await mongoClient.db("YEMPData").collection("MainData").findOne({"name":"user-posts"})
				let getBusinessPosts = await mongoClient.db("YEMPData").collection("MainData").findOne({"name":"business-posts"})
				let getChannelPosts = await mongoClient.db("YEMPData").collection("MainData").findOne({"name":"channel-posts"})
				let getArticlePosts = await mongoClient.db("YEMPData").collection("MainData").findOne({"name":"article-posts"})
				let getMarketPlacePosts = await mongoClient.db("YEMPData").collection("MainData").findOne({"name":"market-place-posts"})
				
				//collections
				let userPosts = getUserPosts.body
				let businessPosts = getBusinessPosts.body
				let channelPosts = getChannelPosts.body 
				let articlePosts = getChannelPosts.body 
				let marketPlacePosts = getMarketPlacePosts.body
				
				let searchUserPosts = await searchCollection(userPosts,searchInput)
				let searchBusinessPosts = await searchCollection(businessPosts,searchInput)
				let searchChannelPosts = await searchCollection(channelPosts,searchInput)
				let searchArticlePosts = await searchCollection(articlePosts,searchInput)
				let searchMarketPlacePosts = await searchCollection(marketPlacePosts,searchInput)
				
				let inputArray = [searchUserPosts,searchBusinessPosts,searchChannelPosts,searchArticlePosts,searchMarketPlacePosts]
				
				let consolidated = await consiolidateCollections(inputArray)
				
				response.send(JSON.stringify({"status":"success","data":consolidated}))
				
			}else{
				response.sendStatus(404)
			}
			
		}catch{
			response.send(JSON.stringify({"status":"server-error"}))
		}
	});
	
	async function filterPostsForBusiness(businessId,posts){
		
		let output = []
		
		for(var i=0; i<posts.length; i++){
			
			let post = posts[i]
			
			let bd = post.basicDetails 
			
			if(bd.businessId && bd.businessId === businessId){
				output.push(post)
			}
			
		}
		
		return output
		
	}
	
	async function filterPostsForBusinesses(posts,channel){
		
		let output = []
		
		if(channel == false){
			for(var i=0; i<posts.length; i++){
				
				let post = posts[i]
				
				let bd = post.basicDetails 
				
				if(bd.businessId){
					output.push(post)
				}
				
			}
		}else{
			
			let getBusinesses = await mongoClient.db("YEMPData").collection("MainData").findOne({"name":"user-businesses"})
			let businesses = getBusinesses.body 
			let channels = []
			
			for(var i=0; i<businesses.length; i++){
				
				let business = businesses[i]
				
				let type = business.type
				
				if(type === "Channel"){
					channels.push(business)
				}
				
			}
			
			for(var i=0; i<posts.length; i++){
				
				let post = posts[i]
				
				let bd = post.basicDetails
				
				if(bd.businessId != null){
					let search = channels.find((channels)=>{
						return channels.businessId === bd.businessId
					})
					if(search){
						output.push(post)
					}
				}
				
			}
			
		}
		
		return output
		
	}
	
	app.post("/search-all-channel-posts",async(request,response)=>{
		try{
			
			let data = request.body;
			let accessorId = data.accessorId 
			let searchInput = data.searchInput
			let socketCheck = await checkIfSocketActive(accessorId)
			
			if(socketCheck == true){
				
				let getChannelPosts = await mongoClient.db("YEMPData").collection("MainData").findOne({"name":"channel-posts"})
				let getArticlePosts = await mongoClient.db("YEMPData").collection("MainData").findOne({"name":"article-posts"})
				let getMarketPlacePosts = await mongoClient.db("YEMPData").collection("MainData").findOne({"name":"market-place-posts"})
				let getVideoPosts = await mongoClient.db("YEMPData").collection("MainData").findOne({"name":"video-posts"})
				
				//collections
				
				let articlePosts = getArticlePosts.body 
				let channelPosts = getChannelPosts.body 
				let marketPlacePosts = getMarketPlacePosts.body
				let videoPosts = getVideoPosts.body
				
				let filteredMarketPlacePosts = await filterPostsForBusinesses(marketPlacePosts,true)
				
				let searchArticlePosts = await searchCollection(articlePosts,searchInput)
				let searchChannelPosts = await searchCollection(channelPosts,searchInput)
				let searchMarketPlacePosts = await searchCollection(filteredMarketPlacePosts,searchInput)
				let searchVideoPosts = await searchCollection(videoPosts,searchInput)
				
				let inputArray = [searchArticlePosts,searchChannelPosts,searchMarketPlacePosts,searchVideoPosts]
				
				let consolidated = await consiolidateCollections(inputArray)
				
				response.send(JSON.stringify({"status":"success","data":consolidated}))
				
			}else{
				response.sendStatus(404)
			}
			
		}catch{
			response.send(JSON.stringify({"status":"server-error"}))
		}
	})
	
	let adminUpdateQueue = []
	
	
	async function updateAdminController(){
		if(adminUpdateQueue.length > 0){
			for(var i = 0; i<adminUpdateQueue.length; i++){
				let controller = adminUpdateQueue[i]
				await mongoClient.db("YEMPData").collection("AdminOnlyInfo").updateOne({"name":"admin-controller-data"},{$set:{"body":controller}})
			}
		}
	}
	async function updateBusinesses(){
		if(businessQueue.length > 0){
			for(var i = 0; i<businessQueue.length; i++){
				let businessData = businessQueue[i]
				let getBusinesses = await mongoClient.db("YEMPData").collection("MainData").findOne({"name":"user-businesses"});
				let businesses = getBusinesses.body;
				
				let index = businesses.findIndex((businesses)=>{
					return businesses.businessId === businessData.businessId
				});
				
				businesses[index] = businessData 
				
				await mongoClient.db("YEMPData").collection("MainData").updateOne({"name":"user-businesses"},{$set:{"body":businesses}})
				
			}
		}
	}
	
	async function updateUsers(){
		if(usersQueue.length > 0){
			for(var i = 0; i<usersQueue.length; i++){
				
				let userData = usersQueue[i]
				let getUsers = await mongoClient.db("YEMPData").collection("MainData").findOne({"name":"user-profiles"});
				let users = getUsers.body;
				
				let index = users.findIndex((users)=>{
					return users.userId === userData.userId
				});
				
				users[index] = userData 
				
				await mongoClient.db("YEMPData").collection("MainData").updateOne({"name":"user-profiles"},{$set:{"body":users}})
				
			}
		}
	}
	
	async function updateGroups(){
		if(groupUpdateQueue.length > 0){
			for(var i = 0; i<groupUpdateQueue.length; i++){
				
				let groupData = groupUpdateQueue[i]
				let getGroups = await mongoClient.db("YEMPData").collection("MainData").findOne({"name":"user-groups"});
				let groups = getUsers.body;
				
				let index = groups.findIndex((groups)=>{
					return groups.groupId === userData.groupId
				});
				
				groups[index] = groupData 
				
				await mongoClient.db("YEMPData").collection("MainData").updateOne({"name":"user-groups"},{$set:{"body":groups}})
				
			}
		}
	}
	
	setInterval(async()=>{
		updateBusinesses()
		updateUsers()
		updateGroups()
		updateAdminController()
	},30000)
	
	app.post("/update-admin-controller-data",async(request,response)=>{
		try{
			
			let data = request.body 
			
			let accessorId = data.accessorId 
			let adminData = data.adminData
			
			let socketCheck = await checkIfSocketActive(accessorId)
			if(socketCheck == true){
				adminUpdateQueue.push(adminData)
				response.send(JSON.stringify({"status":"success"}))
			}
			
		}catch{
			response.send(JSON.stringify({"status":"server-error"}))
		}
	})

	app.post("/check-date-and-time", (request,response)=>{
		try{
			
			allocateTime()
			let time = request.body 
			
			if(
				time.date == serverTime.date &&
				time.month == serverTime.month &&
				time.year == serverTime.year &&
			){
				response.send(JSON.stringify({"status":"success"}))
			}else{
				response.send(JSON.stringify({"status":"error"}))
			}
			
		}catch{
			response.send(JSON.stringify({"status":"server-error"}))
		}
	})
	let groupUpdateQueue = []
	app.post("/update-group-data",async(request,response)=>{
		try{
			
			let data = request.body 
			
			let accessorId = data.accessorId
			
			let groupData = data.groupData
			
			let socketCheck = await checkIfSocketActive(accessorId)
			if(socketCheck == true){
				
				groupUpdateQueue.push(groupData)
				response.send(JSON.stringify({"status":"success"}))
				
			}
			
		}catch{
			response.send(JSON.stringify({"status":"server-error"}))
		}
	})
	
	app.post("/update-shipping-request-message",async(request,response)=>{
		try{
			
			let data = request.body
			
			let message = data.message 
			let userId = data.userId
			let shippingOrderId = data.shippingOrderId
			let corresponderType = data.corresponderType
			let corresponderId = data.corresponderId
			let conversatorMode = data.conversatorMode 
			
			let socketCheck = await checkIfSocketActive(userId)
			
			if(socketCheck == true){
				
				let getUsers = await mongoClient.db("YEMPData").collection("MainData").findOne({"name":"user-profiles"})
				let getBusinesses = await mongoClient.db("YEMPData").collection("MainData").findOne({"name":"user-businesses"})
				
				let users = getUsers.body
				let businesses = getBusinesses.body
				
				if(conversatorMode === "User"){
					let sender = users.find((users)=>{
						return users.userId === userId
					})
					
					let senderRequests = sender.shippingRequests
					let senderRequest = senderRequests.find((senderRequests)=>{
						return senderRequests.orderId === shippingOrderId
					})
					let senderMsgs = senderRequest.messages
					let messageIndex = senderMsgs.findOne((senderMsgs)=>{
						return senderMsgs.id === message.id
					})
					senderMsgs[messageIndex] = message
					
					if(corresponderType === "Business"){
						let reciever = businesses.find((businesses)=>{
							return businesses.businessId === corresponderId
						})
						
						let recieverRequests = reciever.shippingRequests
						let recieverRequest = recieverRequests.find((recieverRequests)=>{
							return recieverRequests.orderId === shippingOrderId
						})
						let recieverMsgs = recieverRequest.messages
						let messageIndex2 = recieverMsgs.findOne((recieverMsgs)=>{
							return recieverMsgs.id === message.id
						})
						recieverMsgs[messageIndex2] = message
					}else{
						let reciever = users.find((users)=>{
							return users.userId === corresponderId
						})
						
						let recieverRequests = reciever.shippingRequests
						let recieverRequest = recieverRequests.find((recieverRequests)=>{
							return recieverRequests.orderId === shippingOrderId
						})
						let recieverMsgs = recieverRequest.messages
						let messageIndex2 = recieverMsgs.findOne((recieverMsgs)=>{
							return recieverMsgs.id === message.id
						})
						recieverMsgs[messageIndex2] = message
					}
					
				}else{
					
					let sender = businesses.find((businesses)=>{
						return businesses.businessId === userId
					})
					
					let senderRequests = sender.shippingRequests
					let senderRequest = senderRequests.find((senderRequests)=>{
						return senderRequests.orderId === shippingOrderId
					})
					let senderMsgs = senderRequest.messages
					let messageIndex = senderMsgs.findOne((senderMsgs)=>{
						return senderMsgs.id === message.id
					})
					senderMsgs[messageIndex] = message
					
					if(corresponderType === "Business"){
						let reciever = businesses.find((businesses)=>{
							return businesses.businessId === corresponderId
						})
						
						let recieverRequests = reciever.shippingRequests
						let recieverRequest = recieverRequests.find((recieverRequests)=>{
							return recieverRequests.orderId === shippingOrderId
						})
						let recieverMsgs = recieverRequest.messages
						let messageIndex2 = recieverMsgs.findOne((recieverMsgs)=>{
							return recieverMsgs.id === message.id
						})
						recieverMsgs[messageIndex2] = message
					}else{
						let reciever = users.find((users)=>{
							return users.userId === corresponderId
						})
						
						let recieverRequests = reciever.shippingRequests
						let recieverRequest = recieverRequests.find((recieverRequests)=>{
							return recieverRequests.orderId === shippingOrderId
						})
						let recieverMsgs = recieverRequest.messages
						let messageIndex2 = recieverMsgs.findOne((recieverMsgs)=>{
							return recieverMsgs.id === message.id
						})
						recieverMsgs[messageIndex2] = message
					}
					
				}
				
				await mongoClient.db("YEMPData").collection("MainData").updateOne({"name":"user-profiles"},{$set:{"body":users}})
				await mongoClient.db("YEMPData").collection("MainData").updateOne({"name":"user-businesses"},{$set:{"body":businesses}})
				
				response.send(JSON.stringify({"status":"success"}))
				
			}else{
				response.sendStatus(404)
			}
			
		}catch{
			response.send(JSON.stringify({"status":"server-error"}))
		}
	})
	
	app.post("/update-delivery-request-message",async(request,response)=>{
		try{
			
			let data = request.body
			
			let message = data.message 
			let userId = data.userId
			let deliveryRequestId = data.deliveryRequestId
			let corresponderType = data.corresponderType
			let corresponderId = data.corresponderId
			let conversatorMode = data.conversatorMode 
			
			let socketCheck = await checkIfSocketActive(userId)
			
			if(socketCheck == true){
				
				let getUsers = await mongoClient.db("YEMPData").collection("MainData").findOne({"name":"user-profiles"})
				let getBusinesses = await mongoClient.db("YEMPData").collection("MainData").findOne({"name":"user-businesses"})
				
				let users = getUsers.body
				let businesses = getBusinesses.body
				
				if(conversatorMode === "User"){
					let sender = users.find((users)=>{
						return users.userId === userId
					})
					
					let senderRequests = sender.shippingRequests
					let senderRequest = senderRequests.find((senderRequests)=>{
						return senderRequests.orderId === deliveryRequestId
					})
					let senderMsgs = senderRequest.messages
					let messageIndex = senderMsgs.findOne((senderMsgs)=>{
						return senderMsgs.id === message.id
					})
					senderMsgs[messageIndex] = message
					
					if(corresponderType === "Business"){
						let reciever = businesses.find((businesses)=>{
							return businesses.businessId === corresponderId
						})
						
						let recieverRequests = reciever.deliverMeQueue
						let recieverRequest = recieverRequests.find((recieverRequests)=>{
							return recieverRequests.orderId === deliveryRequestId
						})
						let recieverMsgs = recieverRequest.messages
						let messageIndex2 = recieverMsgs.findOne((recieverMsgs)=>{
							return recieverMsgs.id === message.id
						})
						recieverMsgs[messageIndex2] = message
					}else{
						let reciever = users.find((users)=>{
							return users.userId === corresponderId
						})
						
						let recieverRequests = reciever.deliverMeQueue
						let recieverRequest = recieverRequests.find((recieverRequests)=>{
							return recieverRequests.orderId === deliveryRequestId
						})
						let recieverMsgs = recieverRequest.messages
						let messageIndex2 = recieverMsgs.findOne((recieverMsgs)=>{
							return recieverMsgs.id === message.id
						})
						recieverMsgs[messageIndex2] = message
					}
					
				}else{
					
					let sender = businesses.find((businesses)=>{
						return businesses.businessId === userId
					})
					
					let senderRequests = sender.deliverMeQueue
					let senderRequest = senderRequests.find((senderRequests)=>{
						return senderRequests.orderId === deliveryRequestId
					})
					let senderMsgs = senderRequest.messages
					let messageIndex = senderMsgs.findOne((senderMsgs)=>{
						return senderMsgs.id === message.id
					})
					senderMsgs[messageIndex] = message
					
					if(corresponderType === "Business"){
						let reciever = businesses.find((businesses)=>{
							return businesses.businessId === corresponderId
						})
						
						let recieverRequests = reciever.deliverMeQueue
						let recieverRequest = recieverRequests.find((recieverRequests)=>{
							return recieverRequests.orderId === deliveryRequestId
						})
						let recieverMsgs = recieverRequest.messages
						let messageIndex2 = recieverMsgs.findOne((recieverMsgs)=>{
							return recieverMsgs.id === message.id
						})
						recieverMsgs[messageIndex2] = message
					}else{
						let reciever = users.find((users)=>{
							return users.userId === corresponderId
						})
						
						let recieverRequests = reciever.deliverMeQueue
						let recieverRequest = recieverRequests.find((recieverRequests)=>{
							return recieverRequests.orderId === deliveryRequestId
						})
						let recieverMsgs = recieverRequest.messages
						let messageIndex2 = recieverMsgs.findOne((recieverMsgs)=>{
							return recieverMsgs.id === message.id
						})
						recieverMsgs[messageIndex2] = message
					}
					
				}
				
				await mongoClient.db("YEMPData").collection("MainData").updateOne({"name":"user-profiles"},{$set:{"body":users}})
				await mongoClient.db("YEMPData").collection("MainData").updateOne({"name":"user-businesses"},{$set:{"body":businesses}})
				
				response.send(JSON.stringify({"status":"success"}))
				
			}else{
				response.sendStatus(404)
			}
			
		}catch{
			response.send(JSON.stringify({"status":"server-error"}))
		}
	})
	
	app.post("/check-conversation-existence",async(request,response)=>{
		try{
			
			let data = request.body
			
			let accessorId = data.accessorId
			let sender = data.sender
			let reciever = data.reciever
			let businessId = null 
			if(data.businessId){
				businessId = data.businessId
			}
			
			let output {
				"sender":null,
				"reciever":null
			};
			
			let socketCheck = await checkIfSocketActive(accessorId)
			
			if(socketCheck == true){
				
				let getUsers = await mongoClient.db("YEMPData").collection("MainData").findOne({"name":"user-profiles"})
				let getBusinesses = await mongoClient.db("YEMPData").collection("MainData").findOne({"name":"user-businesses"})
				let users = getUsers.body 
				let businesses = getBusinesses.body
				
				//locate sender 
				
				let userSender = users.find((users)=>{
					return users.userId === sender
				})
				
				let bizSender = users.find((businesses)=>{
					return businesses.userId === sender
				})
				
				if(bizSender){
					let conversations = bizSender.conversations 
					
					let conversation = conversations.find((conversations)=>{
						return conversations.senderId === reciever
					})
					
					if(conversation){
						output.reciever = "exists"
					}else{
						output.reciever = "non-existent"
					}
				}
				if(userSender){
					let conversations = bizSender.conversations 
					
					let conversation = conversations.find((conversations)=>{
						return conversations.senderId === reciever
					})
					
					if(conversation){
						output.reciever = "exists"
					}else{
						output.reciever = "non-existent"
					}
				}
				
				if(businessId){
					
					let business = businesses.find((businesses)=>{
						return businesses.businessId === businessId
					})
					
					let conversations = business.conversations 
					
					let conversation = conversations.find((conversations)=>{
						return conversations.senderId === sender
					})
					
					if(conversation){
						output.reciever = "exists"
					}else{
						output.reciever = "non-existent"
					}
					
				}else{
					
					let user = users.find((users)=>{
						return users.userId === recieverId
					})
					
					let conversations = user.conversations 
					
					let conversation = conversations.find((conversations)=>{
						return conversations.senderId === sender
					})
					
					if(conversation){
						output.reciever = "exists"
					}else{
						output.reciever = "non-existent"
					}
					
				}
				
				await mongoClient.db("YEMPData").collection("MainData").updateOne({"name":"user-profiles"},{$set:{"body":users}})
				await mongoClient.db("YEMPData").collection("MainData").updateOne({"name":"user-businesses"},{$set:{"body":businesses}})
				
				response.send(JSON.stringify({"status":"success","output":output}))
				
			}else{
				response.sendStatus(404)
			}
			
		}catch{
			response.send(JSON.stringify({"status":"server-error"}))
		}
	})
	
	app.post("/update-media-story",async(request,response)=>{
	    try{
	        let data = request.body 
	        let accessorId = data.accessorId 
	        let story = data.story
	        let socketCheck = await checkIfSocketActive(accessorId)
	        if(socketCheck == true){
	            
	            let getStories = await mongoClient.db("YEMPData").collection("MainData").findOne({"name":"story-posts"})
	            let stories = getStories.body 
	            let story = stories.find((stories)=>{
	                return stories.basicDetails.id === story.basicDetails.id
	            })
	            if(story){
	                let index = stories.findIndex((stories)=>{
    	                return stories.basicDetails.id === story.basicDetails.id
    	            })
    	            stories[index] = story
    	            
    	            await mongoClient.db("YEMPData").collection("MainData").updateOne({"name":"story-posts"},{$set:{"body":stories}})
    	            
    	            response.send(JSON.stringify({"status":"success"}))
	            }
	            
	        }else{
	            response.sendStatus(404)
	        }
	    }catch{
	        response.send(JSON.stringify({"status":"server-error"}))
	    }
	})
	
	async function filterNames(input,users){
	    let output = []
	    
	    for(var i=0;i<users.length;i++){
	        let user = users[i]
	        let r1 = user.firstName.toRegex()
	        let r2 = user.lastName.toRegex()
	        
	        if(r1.matches(input) == true || r2.matches(input) == true){
	            output.push(user.userId)
	        }
	        
	        output.push(user)
	    }
	    
	    return output
	}
	
	async function filterGroups(input,groups){
	    let output = []
	    
	    for(var i=0; i<groups.length;i++){
	        let group = groups[i]
	        let r1 = groupName.toRegex()
	        let test = r1.matches(input)
	        if(test == true){
	            output.push(group)
	        }
	    }
	    
	    return output
	}
	
	async function filterChannels(input,businesses){
	    let output = []
	    
	    for(var i=0; i<businesses.length;i++){
	        let business = businesses[i]
	        let r1 = business.businessName.toRegex()
	        let test = r1.matches(input)
	        let test2 = r2.matches(input)
	        if(test == true && business.type === "Video Channel"){
	            output.push(business)
	        }
	    }
	    
	    return output
	}
	
	async function keywordFind(keywords,input){
	    let output = false 
	    
	    for(var i=0,keywords.length; i++){
	        let x = keywords[i]
	        let r = x.toRegex()
	        let t = r.matches(input)
	        if(t == true){
	            output = true
	        }
	    }
	    
	    return output 
	}
	
	async function filterChannelVideos(input,businesses){
	    let output = []
	    
	    var getVideoPosts = await mongoClient.db("YEMPData").collection("MainData").findOne({"name":"video-posts"})
        let videos = getVideoPosts.body 
        
	    
	    for(var i=0; i<businesses.length;i++){
	        let business = businesses[i]
	        let posts = business.posts
	        let r1 = business.businessName.toRegex()
	        let test = r1.matches(input)
	        
	        if(test == true && business.type === "Video Channel"){
	            output.push(input)
	        }
	        for(var x=0; x<posts.length ; x++){
	            
	            let video = posts[x]
	            
	            if(classType == "Video"){
	                let r1 = video.title.toRegex()
	                let r2 = video.description.toRegex()
	                let t1 = r1.matches(input)
	                let t2 = r2.matches(input)
	                let t3 = await keywordFind(video.keywords,input)
	                if(t1 == true || t2 == true || t3 == true){
	                    output.push(video)
	                }
	            }
	        }
	    }
	    
	    return output
	}
	
	async function filterPages(input,businesses){
	    let output = []
	    for(var i=0; i<businesses.length;i++){
	        let business = businesses[i]
	        let r1 = business.businessName.toRegex()
	        let test = r1.matches(input)
	        if(test == true && business.type != "Video Channel"){
	            output.push(business)
	        }
	    }
	    return output
	}
	
	async function filterPlaylists(input,playlists){
	    let output = []
	    
	    for(var i=0; i<playlists.length; i++){
	        let playlist = playlists[i]
	        let name = playlist.name
	        let r1 = name.toRegex()
	        let test = r1.matches(input)
	        if(test == true){
	            output.push(playlist)
	        }
	    }
	    
	    return output
	}
	
	app.post("/search-groups", async(request,response)=>{

	    try{

	        let data = request.body
	        let accessorId = data.accessorId 
	        let input = data.searchInput 
	        let socketCheck = await checkIfSocketActive(input)
	        
	        if(socketCheck == true){
	            
	            let groups = await mongoClient.db("YEMPData").collection("MainData").findOne({"name":"user-groups"})
	            let filtered = await filterGroups(groups.body,input)
	            response.send(JSON.stringify({"status":"success","data":filtered}))
	            
	        }else{
	            response.send(JSON.stringify({"status":"error"}))
	        }
	        
	    }catch{
	        response.send(JSON.stringify({"status":"server-error"}))
	    }
	})
	
	app.post("/search-playlists", async(request,response)=>{
	    try{
	        let data = request.body
	        let accessorId = data.accessorId 
	        let input = data.searchInput 
	        let socketCheck = await checkIfSocketActive(input)
	        
	        if(socketCheck == true){
	            
	            let playlists = await mongoClient.db("YEMPData").collection("MainData").findOne({"name":"user-playlists"})
	            let filtered = await filterPlaylists(playlists.body,input)
	            response.send(JSON.stringify({"status":"success","data":filtered}))
	            
	            
	        }else{
	            response.send(JSON.stringify({"status":"error"}))
	        }
	        
	    }catch{
	        response.send(JSON.stringify({"status":"server-error"}))
	    }
	})
	
	app.post("/search-channel-videos", async(request,response)=>{
	    try{
	        let data = request.body
	        let accessorId = data.accessorId 
	        let input = data.searchInput 
	        let socketCheck = await checkIfSocketActive(input)
	        
	        if(socketCheck == true){
	            
	            let businesses = await mongoClient.db("YEMPData").collection("MainData").findOne({"name":"user-businesses"})
	            
	            
	        }else{
	            response.send(JSON.stringify({"status":"error"}))
	        }
	        
	    }catch{
	        response.send(JSON.stringify({"status":"server-error"}))
	    }
	})
	
	app.post("/search-channels", async(request,response)=>{
	    try{
	        let data = request.body
	        let accessorId = data.accessorId 
	        let input = data.searchInput 
	        let socketCheck = await checkIfSocketActive(input)
	        
	        if(socketCheck == true){
	            
	            let businesses = await mongoClient.db("YEMPData").collection("MainData").findOne({"name":"user-businesses"})
	            let filtered = await filterChannels(businesses.body,input)
	            response.send(JSON.stringify({"status":"success","data":filtered}))
	            
	        }else{
	            response.send(JSON.stringify({"status":"error"}))
	        }
	        
	    }catch{
	        response.send(JSON.stringify({"status":"server-error"}))
	    }
	})
	
	app.post("/search-pages", async(request,response)=>{
	    try{
	        let data = request.body
	        let accessorId = data.accessorId 
	        let input = data.searchInput 
	        let socketCheck = await checkIfSocketActive(input)
	        
	        if(socketCheck == true){
	            
	            let businesses = await mongoClient.db("YEMPData").collection("MainData").findOne({"name":"user-businesses"})
	            let filtered = await filterPages(businesses.body,input)
	            response.send(JSON.stringify({"status":"success","data":filtered}))
	            
	        }else{
	            response.send(JSON.stringify({"status":"error"}))
	        }
	        
	    }catch{
	        response.send(JSON.stringify({"status":"server-error"}))
	    }
	    
	})
	
	app.post("/search-people", async(request,response)=>{
	    try{
	        let data = request.body
	        let accessorId = data.accessorId 
	        let input = data.searchInput 
	        let socketCheck = await checkIfSocketActive(input)
	        
	        if(socketCheck == true){
	            
	            let users = await mongoClient.db("YEMPData").collection("MainData").findOne({"name":"user-profile"})
	            let filteredUserNames = await filterNames(searchInput,users.body)
	            
	            response.send(JSON.stringify({"status":"success","data":filteredUserNames}))
	            
	        }else{
	            response.send(JSON.stringify({"status":"error"}))
	        }
	        
	    }catch{
	        response.send(JSON.stringify({"status":"server-error"}))
	    }
	})
	
	//story cleaner service 
	async function cleanUpStories(){
	    let getStories = await mongoClient.db("YEMPData").collection("MainData").findOne({"name":"story-posts"})
	    let stories = getStories.body 
	    for(var i=0; i<stories.length;i++){
	        let story = stories[i]
	        let date = story.basicDetails.timePosted
	        if(
	            date.date != serverTime.date &&
	            date.month != serverTime.month || 
	            date.year != serverTime.year
	        ){
	            if(story.archived == false){
	                stories.splice(i,1)
	            }
	           
	        }
	    }
	    await mongoClient.db("YEMPData").collection("MainData").updateOne({"name":"story-posts"},{$set:{"body":stories}})
	}
	
	app.post("/send-video-call-output/:id",async(request,response)=>{
		try{

			let userid = request.params.id 
			
			let socketCheck = await checkIfSocketActive(userid)
			
			if(socketCheck == true){

				let readStream = ss(io.sockets).createStream()
				fs.createReadStream(request.body).pipe(readStream)
				
				app.get(`/recieve-video-call-feed/${userid}`,(request,response)=>{
				    response.pipe(readStream)
				})
				
			}
		}catch{
			//No handler
		}
	})
	app.post("/send-audio-call-output/:id",async(request,response)=>{
		try{

			let userid = request.params.id 
			
			let socketCheck = await checkIfSocketActive(userid)
			
			if(socketCheck == true){

				let readStream = ss(io.sockets).createStream()
				fs.createReadStream(request.body).pipe(readStream)
				
				app.get(`/recieve-audio-call-feed/${userid}`,(request,response)=>{
				    response.pipe(readStream)
				})
			}
		}catch{
			//No handler
		}
	})
	
	app.post("/send-live-stream-output/:id",async(request,response)=>{
		try{

			let feedId = request.params.id 
			
			let feed = liveFeeds.find((liveFeeds)=>{
			    return liveFeeds.feedId === feedId
			})
			
			let accessorId = feed.accessorId
			
			let socketCheck = await checkIfSocketActive(accessorId)
			
			if(socketCheck == true){

				let readStream = ss(io.sockets).createStream()
				fs.createReadStream(request.body).pipe(readStream)
				
				app.get(`/recieve-live-feed/${userid}`,(request,response)=>{
				    response.pipe(readStream)
				})
				
				when(readStream.ended() == true){
				    response.end("Completed")
				}
				
			}
		}catch{
			//No handler
		}
	})
	
	
	setInterval(cleanUpStories(),1000*60*5)

server.listen(port)