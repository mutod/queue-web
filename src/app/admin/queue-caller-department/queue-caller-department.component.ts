import { Component, OnInit, OnDestroy, ViewChild, NgZone, Inject } from '@angular/core';
import * as mqttClient from '../../../vendor/mqtt';
import { MqttClient } from 'mqtt';
import * as Random from 'random-js';

import { ModalSelectServicepointsComponent } from 'src/app/shared/modal-select-servicepoints/modal-select-servicepoints.component';
import { ModalSelectDepartmentComponent } from 'src/app/shared/modal-select-department/modal-select-department.component';
import { QueueService } from 'src/app/shared/queue.service';
import { AlertService } from 'src/app/shared/alert.service';
import { ServiceRoomService } from 'src/app/shared/service-room.service';

import { CountdownComponent } from 'ngx-countdown';
import { JwtHelperService } from '@auth0/angular-jwt';

@Component({
  selector: 'app-queue-caller-department',
  templateUrl: './queue-caller-department.component.html',
  styles: []
})
export class QueueCallerDepartmentComponent implements OnInit {

  @ViewChild('mdlServicePoint') private mdlServicePoint: ModalSelectDepartmentComponent;

  message: string;
  // servicePointId: any;
  // servicePointName: any;
  departmentId: any;
  departmentName: any;
  queues = [];
  pendingItems: any = [];
  historyItems: any = [];
  rooms: any = [];
  queueNumber: any;
  roomNumber: any;
  roomId: any;
  queueId: any;

  isAllServicePoint = false;

  total = 0;
  pageSize = 10;
  maxSizePage = 5;
  currentPage = 1;
  offset = 0;

  // currentTopic: any;

  isOffline = false;

  client: MqttClient;
  jwtHelper = new JwtHelperService();
  servicePointTopic = null;
  globalTopic = null;
  notifyUser = null;
  notifyPassword = null;
  isMarkPending = false;
  pendingToServicePointId: any = null;

  selectedQueue: any = {};
  notifyUrl: string;

  @ViewChild(CountdownComponent) counter: CountdownComponent;

  constructor(
    private queueService: QueueService,
    private roomService: ServiceRoomService,
    private alertService: AlertService,
    private zone: NgZone,
    @Inject('API_URL') private apiUrl: string,
  ) {
    const token = sessionStorage.getItem('token');
    const decodedToken = this.jwtHelper.decodeToken(token);
    this.servicePointTopic = decodedToken.SERVICE_POINT_TOPIC;
    this.globalTopic = decodedToken.QUEUE_CENTER_TOPIC;

    this.notifyUrl = `ws://${decodedToken.NOTIFY_SERVER}:${+decodedToken.NOTIFY_PORT}`;
    this.notifyUser = decodedToken.NOTIFY_USER;
    this.notifyPassword = decodedToken.NOTIFY_PASSWORD;
  }

  public unsafePublish(topic: string, message: string): void {
    try {
      this.client.end(true);
    } catch (error) {
      console.log(error);
    }
  }

  public ngOnDestroy() {
    try {
      this.client.end(true);
    } catch (error) {
      console.log(error);
    }
  }

  ngOnInit() { }

  connectWebSocket() {
    const rnd = new Random();
    const username = sessionStorage.getItem('username');
    const strRnd = rnd.integer(1111111111, 9999999999);
    const clientId = `${username}-${strRnd}`;

    try {
      // close old connection
      this.client.end(true);
    } catch (error) {
      console.log(error);
    }

    this.client = mqttClient.connect(this.notifyUrl, {
      clientId: clientId,
      username: this.notifyUser,
      password: this.notifyPassword
    });

    const that = this;
    // const topic = `${this.servicePointTopic}/${this.servicePointId}`;
    const topic = `${this.servicePointTopic}/`;
    const visitTopic = this.globalTopic;

    this.client.on('connect', () => {
      console.log('Connected!');
      that.zone.run(() => {
        that.isOffline = false;
      });

      that.client.subscribe(topic, (error) => {
        console.log('Subscribe : ' + topic);

        if (error) {
          that.zone.run(() => {
            that.isOffline = true;
            try {
              that.counter.restart();
            } catch (error) {
              console.log(error);
            }
          });
        }
      });

      that.client.subscribe(visitTopic, (error) => {
        console.log('Subscribe : ' + visitTopic);
        if (error) {
          that.zone.run(() => {
            that.isOffline = true;
            try {
              that.counter.restart();
            } catch (error) {
              console.log(error);
            }
          });
        }
      });
    });

    this.client.on('close', () => {
      console.log('Close');
    });

    this.client.on('message', (topic, payload) => {
      this.getAllList();
    });

    this.client.on('error', (error) => {
      console.log('Error');
      that.zone.run(() => {
        that.isOffline = true;
        that.counter.restart();
      });
    });

    this.client.on('offline', () => {
      console.log('Offline');
      that.zone.run(() => {
        that.isOffline = true;
        try {
          that.counter.restart();
        } catch (error) {
          console.log(error);
        }
      });
    })
  }

  // onPageChange(event: any) {
  //   const _currentPage = +event;
  //   var _offset = 0;
  //   if (_currentPage > 1) {
  //     _offset = (_currentPage - 1) * this.pageSize;
  //   }

  //   this.offset = _offset;
  //   this.getWaiting();
  // }

  onFinished() {
    console.log('Time finished!');
    this.connectWebSocket();
  }

  onNotify($event) {
    console.log('Finished');
  }

  setChangeRoom(item: any) {
    this.queueId = item.queue_id;
    this.queueNumber = item.queue_number;
  }

  // async doChangeRoom(room: any) {
  //   if (this.isOffline) {
  //     this.alertService.error('กรุณาตรวจสอบการเชื่อมต่อกับ Notify Server');
  //   } else {
  //     const roomId = room.room_id;
  //     const queueId = this.queueId;
  //     const roomNumber = room.room_number;
  //     const queueNumber = this.queueNumber;
  //     try {
  //       const isConfirm = await this.alertService.confirm('ต้องการเปลี่ยนช่องบริการ ใช่หรือไม่')
  //       if (isConfirm) {
  //         const rs: any = await this.queueService.changeRoom(queueId, roomId, this.servicePointId, roomNumber, queueNumber);
  //         if (rs.statusCode === 200) {
  //           this.alertService.success();
  //           this.getWorking();
  //         } else {
  //           this.alertService.error(rs.message);
  //         }
  //       }
  //     } catch (error) {
  //       console.error(error);
  //       this.alertService.error('เกิดข้อผิดพลาด');
  //     }
  //   }
  // }

  async getQueues() {
    try {
      const rs: any = await this.queueService.getQueueByDepartment(this.departmentId, this.pageSize, this.offset);
      console.log(rs.results);

      if (rs.statusCode === 200) {
        this.queues = rs.results;
        this.total = rs.total;
      } else {
        console.log(rs.message);
        this.alertService.error('เกิดข้อผิดพลาด');
      }
    } catch (error) {
      console.log(error);
      this.alertService.error();
    }
  }

  // async getWorking() {
  //   try {
  //     const rs: any = await this.queueService.getWorking(this.servicePointId);
  //     if (rs.statusCode === 200) {
  //       this.workingItems = rs.results;
  //     } else {
  //       console.log(rs.message);
  //       this.alertService.error('เกิดข้อผิดพลาด');
  //     }
  //   } catch (error) {
  //     console.log(error);
  //     this.alertService.error();
  //   }
  // }

  // async getHistory() {
  //   try {
  //     const rs: any = await this.queueService.getWorkingHistory(this.servicePointId);
  //     if (rs.statusCode === 200) {
  //       this.historyItems = rs.results;
  //     } else {
  //       console.log(rs.message);
  //       this.alertService.error('เกิดข้อผิดพลาด');
  //     }
  //   } catch (error) {
  //     console.log(error);
  //     this.alertService.error();
  //   }
  // }

  // async getPending() {
  //   try {
  //     const rs: any = await this.queueService.getPending(this.servicePointId);
  //     if (rs.statusCode === 200) {
  //       this.pendingItems = rs.results;
  //     } else {
  //       console.log(rs.message);
  //       this.alertService.error('เกิดข้อผิดพลาด');
  //     }
  //   } catch (error) {
  //     console.log(error);
  //     this.alertService.error();
  //   }
  // }

  // async getRooms() {
  //   try {
  //     const rs: any = await this.roomService.list(this.servicePointId);
  //     if (rs.statusCode === 200) {
  //       this.rooms = rs.results;
  //     } else {
  //       console.log(rs.message);
  //       this.alertService.error('เกิดข้อผิดพลาด');
  //     }
  //   } catch (error) {
  //     console.log(error);
  //     this.alertService.error();
  //   }
  // }

  selectDepartment() {
    this.isMarkPending = false;
    this.mdlServicePoint.open(false);
  }

  showSelectPointForMarkPending(item: any) {
    this.selectedQueue = item;
    this.isMarkPending = true;
    this.mdlServicePoint.open(true);
  }

  onSelectedDepartment(event: any) {
    if (event) {
      if (!this.isMarkPending) {
        this.departmentId = event.department_id;
        this.departmentName = event.department_name;

        this.connectWebSocket();
        this.getAllList();
      } else {
        // this.pendingToServicePointId = event.service_point_id;
        // this.doMarkPending(this.selectedQueue);
      }
    }
  }

  getServicePoint() {

  }

  getAllList() {
    this.getQueues();
    // this.getWorking();
    // this.getRooms();
    // this.getPending();
    // this.getHistory();
  }

  setQueueForCall(item: any) {
    this.queueId = item.queue_id;
    this.queueNumber = item.queue_number;
  }

  // setCallDetail(item: any) {
  //   this.queueId = item.queue_id;
  //   this.queueNumber = item.queue_number;
  //   if (this.rooms.length === 1) {
  //     this.roomId = this.rooms[0].room_id;
  //     this.roomNumber = this.rooms[0].room_number;
  //     this.doCallQueue();
  //   }
  // }

  // callAgain(queue: any) {
  //   this.roomNumber = queue.room_number;
  //   this.roomId = queue.room_id;
  //   this.queueNumber = queue.queue_number;
  //   this.queueId = queue.queue_id;
  //   this.doCallQueue();
  // }

  // prepareQueue(room: any) {
  //   this.roomId = room.room_id;
  //   this.roomNumber = room.room_number;

  //   this.doCallQueue();
  // }

  // async interviewQueue(room: any) {
  //   this.roomId = room.room_id;
  //   this.roomNumber = room.room_number;
  //   // update interview
  //   this.doCallQueue('N');
  // }

  // async doCallQueue(isCompleted: any = 'Y') {
  //   if (this.isOffline) {
  //     this.alertService.error('กรุณาตรวจสอบการเชื่อมต่อกับ Notify Server');
  //   } else {
  //     try {
  //       const rs: any = await this.queueService.callQueue(this.servicePointId, this.queueNumber, this.roomId, this.roomNumber, this.queueId, isCompleted);
  //       if (rs.statusCode === 200) {
  //         this.alertService.success();
  //         this.getAllList();
  //         this.roomId = null;
  //         this.roomNumber = null;
  //         this.queueNumber = null;
  //         this.queueId = null;
  //       } else {
  //         this.alertService.error(rs.message);
  //       }
  //     } catch (error) {
  //       console.error(error);
  //       this.alertService.error('เกิดข้อผิดพลาด');
  //     }
  //   }
  // }

  // async doMarkPending(item: any) {
  //   if (this.servicePointId === this.pendingToServicePointId) {
  //     this.alertService.error('ไม่สามารถสร้างคิวในแผนกเดียวกันได้');
  //   } else {
  //     const _confirm = await this.alertService.confirm(`ต้องการพักคิวนี้ [${item.queue_number}] ใช่หรือไม่?`);
  //     if (_confirm) {
  //       try {
  //         const rs: any = await this.queueService.markPending(item.queue_id, this.pendingToServicePointId);
  //         if (rs.statusCode === 200) {
  //           this.alertService.success();
  //           this.selectedQueue = {};
  //           this.isMarkPending = false;
  //           var queueNumber = rs.queueNumber;
  //           var newQueueId = rs.queueId;
  //           var confirm = await this.alertService.confirm(`คิวใหม่ของคุณคือ ${queueNumber} ต้องการพิมพ์บัตรคิว หรือไม่?`);
  //           if (confirm) {
  //             this.printQueue(newQueueId);
  //           }
  //           this.getAllList();
  //         } else {
  //           this.alertService.error(rs.message);
  //         }
  //       } catch (error) {
  //         console.log(error);
  //         this.alertService.error();
  //       }
  //     }
  //   }
  // }

  // async cancelQueue(queue: any) {
  //   const _confirm = await this.alertService.confirm(`ต้องการรยกเลิกคิวนี้ [${queue.queue_number}] ใช่หรือไม่?`);
  //   if (_confirm) {
  //     try {
  //       const rs: any = await this.queueService.markCancel(queue.queue_id);
  //       if (rs.statusCode === 200) {
  //         this.alertService.success();
  //         this.getAllList();
  //       } else {
  //         this.alertService.error(rs.message);
  //       }
  //     } catch (error) {
  //       console.log(error);
  //       this.alertService.error();
  //     }
  //   }
  // }

  // async printQueue(queueId: any) {
  //   var usePrinter = localStorage.getItem('clientUserPrinter');
  //   var printerId = localStorage.getItem('clientPrinterId');

  //   if (usePrinter === 'Y') {
  //     var topic = `/printer/${printerId}`;
  //     try {
  //       var rs: any = await this.queueService.printQueueGateway(queueId, topic);
  //       if (rs.statusCode === 200) {
  //         //success
  //       } else {
  //         this.alertService.error('ไม่สามารถพิมพ์บัตรคิวได้')
  //       }
  //     } catch (error) {
  //       console.log(error);
  //       this.alertService.error('ไม่สามารถพิมพ์บัตรคิวได้');
  //     }
  //     //
  //   } else {
  //     window.open(`${this.apiUrl}/print/queue?queueId=${queueId}`, '_blank');
  //   }
  // }


}