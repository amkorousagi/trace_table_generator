#include <stdio.h>

int myg = 7;
int main(void){

    int a = 0, b = 1, c= 2;
    a = b + c;
    printf("%d",a);fflush(stdout);
    printf("%d",a+2);fflush(stdout);

    int arr[2][2] = {0,};
    int arr2[10] = {0,};
    int i=0;
    for(i=0;i<=10;i++){
        arr2[i] = 1;
    }

    arr2[1] = arr2[2] + arr2[3]; 
    return 0;
}