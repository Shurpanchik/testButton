/**
 * Created by andrew on 09.11.2016.
 */

var Connection = require('tedious').Connection;

var config = {
    userName: 'sql_user',
    password: 'Wd8Ybc2d@A',
    server: 'sql-server-777.database.windows.net',
    // When you connect to Azure SQL Database, you need these next options.
    options: {encrypt: true, database: 'mschatbot', rowCollectionOnRequestCompletion: true, rowCollectionOnDone: true}
};

//var connection = new Connection(config);
//connection.on('connect', function (err) {
//    // If no error, then good to proceed.
//    console.log("Connected");
//    //executeStatement();
//});

var ConnectionPool = require('tedious-connection-pool');
var Request = require('tedious').Request;
var TYPES = require('tedious').TYPES;

var poolConfig = {
    min: 10,
    max: 300,
    log: false
};

var pool = new ConnectionPool(poolConfig, config);

pool.on('error', function (err) {
    console.error(err);
});

var funcs = {};

var USER_TYPES = {
    TYPICAL: 0,
    MODERATOR: 1,
};

function clrModerator(address) {
    pool.acquire(function (err, connection) {
        if (err) {
            console.error(err);
            return;
        }

        var request = new Request(
            "UPDATE USERS SET Type = @ModeratorType WHERE UserId = @UserId",
            function (err) {
                if (err) {
                    console.log(err);
                }

                connection.release();
            });

        request.addParameter('ModeratorType', TYPES.Int, USER_TYPES.TYPICAL);
        request.addParameter('UserId', TYPES.VarChar, address.user.id);

        request.on('doneProc', function (rowCount, more, returnStatus, rows) {
            //console.log(rowCount + ' rows returned doneProc');
        });

        connection.execSql(request);
    });
}

function getMessageData(message_id, callback_func) {
    pool.acquire(function (err, connection) {
        if (err) {
            console.error(err);
            return;
        }

        var request = new Request("SELECT Msg, UserId, ModeratorId FROM QUESTION_ANSWER WHERE Id = @Id", function (err) {
            if (err) {
                console.log(err);
            }

            connection.release();
        });

        request.addParameter('Id', TYPES.Int, message_id);

        var question = {};
        request.on('row', function (columns) {
            question = {
                question: columns[0].value,
                user_id: columns[1].value,
                moderator_id: columns[2].value,
            };
        });

        request.on('doneProc', function (rowCount, more, returnStatus, rows) {
            //console.log(rowCount + ' rows returned doneProc');

            if (callback_func) {
                callback_func(question);
            }
        });

        connection.execSql(request);
    });
}

function addMessage(msg, inserted_id, moderator_id, user_id, is_form_user, callback_func) {
    pool.acquire(function (err, connection) {
        if (err) {
            console.error(err);
            return;
        }

        var request = new Request(
            "INSERT INTO QUESTION_ANSWER(Msg, QuestionId, ModeratorId, UserId, FromUser, DateAndTime) " +
                //"OUTPUT INSERTED.Id " +
            "VALUES (@Msg, @MsgId, @ModeratorId, @UserId, @FromUser, CURRENT_TIMESTAMP); select @@identity",
            function (err) {
                if (err) {
                    console.log(err);
                }

                connection.release();
            });

        request.addParameter('Msg', TYPES.NVarChar, msg);
        request.addParameter('MsgId', TYPES.Int, inserted_id);
        request.addParameter('ModeratorId', TYPES.NVarChar, moderator_id);
        request.addParameter('UserId', TYPES.NVarChar, user_id);
        request.addParameter('FromUser', TYPES.Bit, is_form_user);
        //request.addOutputParameter("Id", TYPES.UniqueIdentifier);

        var inserted_id = 0;
        request.on('row', function (columns) {
            inserted_id = columns[0].value;
        });

        request.on('doneProc', function (rowCount, more, returnStatus, rows) {
            //console.log(rowCount + ' rows returned doneProc');

            if (callback_func) {
                callback_func(inserted_id);
            }
        });

        connection.execSql(request);
    });
}

function setModerator(address) {
    pool.acquire(function (err, connection) {
        if (err) {
            console.error(err);
            return;
        }

        var request = new Request(
            "IF NOT EXISTS (SELECT * FROM USERS WHERE UserId = @UserId) " +
            "BEGIN INSERT INTO USERS VALUES (@Name, @ModeratorType, @UserId, @Address, CURRENT_TIMESTAMP) END " +
            "ELSE BEGIN UPDATE USERS SET Type = @ModeratorType WHERE UserId = @UserId END",
            function (err) {
                if (err) {
                    console.log(err);
                }

                connection.release();
            });

        request.addParameter('ModeratorType', TYPES.Int, USER_TYPES.MODERATOR);
        request.addParameter('UserId', TYPES.VarChar, address.user.id);
        request.addParameter('Name', TYPES.NVarChar, address.user.name == undefined ? null : address.user.name);
        request.addParameter('Address', TYPES.NVarChar, JSON.stringify(address));

        request.on('doneProc', function (rowCount, more, returnStatus, rows) {
            //console.log(rowCount + ' rows returned doneProc');
        });

        connection.execSql(request);
    });
}

function getQuestionsList(callback_func) {
    pool.acquire(function (err, connection) {
        if (err) {
            console.error(err);
            return;
        }

        var request = new Request("SELECT Id, Msg, Type FROM TYPICAL_QUESTIONS", function (err) {
            if (err) {
                console.log(err);
            }

            connection.release();
        });

        var list = [];
        request.on('row', function (columns) {
            list.push({
                id: columns[0].value,
                msg: columns[1].value,
                type: columns[2].value
            });
        });

        request.on('doneProc', function (rowCount, more, returnStatus, rows) {
            callback_func(list);
        });

        connection.execSql(request);
    });
}

function getAllUsersAndQuestionById(question_id, callback_func) {
    pool.acquire(function (err, connection) {
        if (err) {
            console.error(err);
            return;
        }

        var request = new Request("SELECT Address, " +
            "(SELECT Msg FROM TYPICAL_QUESTIONS WHERE Id = @Id), (SELECT Type FROM TYPICAL_QUESTIONS WHERE Id = @Id) " +
            "FROM USERS WHERE Type = @UserType", function (err) {
            if (err) {
                console.log(err);
            }

            connection.release();
        });

        request.addParameter('Id', TYPES.Int, question_id);
        request.addParameter('UserType', TYPES.Int, USER_TYPES.TYPICAL);

        var allUsers = [];
        request.on('row', function (columns) {
            allUsers.push({
                address: JSON.parse(columns[0].value),
                msg: columns[1].value,
                type: columns[2].value
            });
        });

        request.on('doneProc', function (rowCount, more, returnStatus, rows) {
            callback_func(allUsers);
        });

        connection.execSql(request);
    });
}

//fixme пользователь должен выбираться по всем параметрам, а не только id.
function getUser(user_id, moderator_id, callback_func) {
    pool.acquire(function (err, connection) {
        if (err) {
            console.error(err);
            return;
        }

        var request = new Request("SELECT Address, (SELECT Type FROM USERS WHERE UserId = @ModeratorId) FROM USERS WHERE UserId = @UserId", function (err) {
            if (err) {
                console.log(err);
            }

            connection.release();
        });

        request.addParameter('UserId', TYPES.VarChar, user_id);
        request.addParameter('ModeratorId', TYPES.VarChar, moderator_id);

        var moderator = false;
        var exist = false;
        var address;
        request.on('row', function (columns) {
            exist = true;

            address = JSON.parse(columns[0].value);

            if (columns[1].value == USER_TYPES.MODERATOR) {
                moderator = true;
            }
        });

        request.on('doneProc', function (rowCount, more, returnStatus, rows) {
            callback_func({
                exist: exist,
                address: address,
                moderator: moderator
            });
        });

        connection.execSql(request);
    });
}

function isAnyUserModerator(callback_func) {
    pool.acquire(function (err, connection) {
        if (err) {
            console.error(err);
            return;
        }

        var mod_request = new Request("SELECT Address FROM USERS WHERE Type = @Type", function (err, rowCount) {
            if (err) {
                console.log(err);
            }

            connection.release();
        });

        mod_request.addParameter('Type', TYPES.Int, USER_TYPES.MODERATOR);

        var exist = false;
        var address = [];
        mod_request.on('row', function (columns) {
            exist = true;
            address.push(JSON.parse(columns[0].value));
        });

        mod_request.on('doneProc', function (rowCount, more, returnStatus, rows) {
            callback_func({
                exist: exist,
                address: address,
            });
        });

        connection.execSql(mod_request);
    });
}

function checkForUser(address, callback_func) {
    pool.acquire(function (err, connection) {
        if (err) {
            console.error(err);
            return;
        }

        var request = new Request(
            "SELECT Id FROM USERS WHERE UserId = @UserId",
            function (err, rowCount) {
                if (err) {
                    console.log(err);
                }

                connection.release();
            });

        request.addParameter('UserId', TYPES.VarChar, address.user.id);

        var counter = 0;
        request.on('row', function (columns) {
            counter++;
        });

        request.on('doneProc', function (rowCount, more, returnStatus, rows) {
            callback_func(counter > 0 ? true : false);
        });

        connection.execSql(request);
    });
}

//address && address.user && address.bot && address.serviceUrl
function addUser(address) { //session.message.address
    pool.acquire(function (err, connection) {
        if (err) {
            console.error(err);
            return;
        }

        var request = new Request(
            "IF NOT EXISTS (SELECT * FROM USERS WHERE UserId = @UserId) " +
            "BEGIN INSERT INTO USERS VALUES (@Name, @Type, @UserId, @Address, CURRENT_TIMESTAMP) END",
            function (err, rowCount) {
                if (err) {
                    console.log(err);
                }

                connection.release();
            });

        request.addParameter('Name', TYPES.NVarChar, address.user.name == undefined ? null : address.user.name);
        request.addParameter('Type', TYPES.Int, USER_TYPES.TYPICAL);
        request.addParameter('UserId', TYPES.VarChar, address.user.id);
        request.addParameter('Address', TYPES.NVarChar, JSON.stringify(address));

        request.on('doneProc', function (rowCount, more, returnStatus, rows) {
            //console.log(rowCount + ' rows returned doneProc');
        });

        connection.execSql(request);
    });
}

Array.prototype.contains = function (elem) {
    for (var i in this) {
        if (this[i] == elem) return true;
    }
    return false;
};

function getSpeakersAndPhotos(/*speaker_name*/callback_func) {
    pool.acquire(function (err, connection) {
        if (err) {
            console.error(err);
            return;
        }
        var request = new Request("SELECT SpeakerName, SpeakerPosition, SpeakerReport, Link, Company FROM LINKS", function (err) {
            if (err) {
                console.log(err);
            }

            connection.release();
        });

        var result = [];
        var global_companies = [];
        request.on('row', function (columns) {
            var company = columns[4].value;

            if (!(global_companies.contains(company))) {
                global_companies.push(company);
            }

            result.push({
                speaker: columns[0].value,
                position: columns[1].value,
                report: columns[2].value,
                link: columns[3].value,
                company: company,
            });
        });

        request.on('doneProc', function (rowCount, more, returnStatus, rows) {
            //console.log(rowCount + ' rows returned');
            //return null;
            callback_func(result, global_companies);
        });

        connection.execSql(request);
    });
}

funcs.getMessageData = getMessageData;
funcs.addMessage = addMessage;
funcs.getQuestionsList = getQuestionsList;
funcs.getAllUsersAndQuestionById = getAllUsersAndQuestionById;
funcs.getUser = getUser;
funcs.checkForUser = checkForUser;
funcs.clrModerator = clrModerator;
funcs.setModerator = setModerator;
funcs.isAnyUserModerator = isAnyUserModerator;
funcs.addUser = addUser;
funcs.getSpeakersAndPhotos = getSpeakersAndPhotos;

module.exports = funcs;